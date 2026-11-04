/**
 * PrintQ OTP server (zero dependencies).
 *
 * Endpoints:
 *   POST /api/auth/send-otp    { mobile, domain } -> sends a real 4-digit SMS OTP
 *   POST /api/auth/verify-otp  { mobile, code }  -> verifies the OTP
 *   GET  /api/health
 *
 * SMS gateway: Twilio is used when TWILIO_* env vars are present, otherwise a
 * generic SMS_API_URL gateway can be configured. With no gateway the server
 * returns the code as `devCode` so local previews keep working.
 *
 * Run with: npm run otp-server
 */
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";

function loadEnvFile(filePath = ".env") {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 0) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env is optional.
  }
}

loadEnvFile();

const PORT = Number(process.env.OTP_SERVER_PORT || 8787);
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const otpStore = new Map();

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 10_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function normalizeMobile(mobile) {
  return String(mobile ?? "").replace(/\D/g, "").slice(-10);
}

function cleanDomain(domain) {
  return (
    String(domain ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "") || "localhost"
  );
}

function hashOtp(otp, salt) {
  return crypto.createHash("sha256").update(`${salt}:${otp}`).digest("hex");
}

/** Strict 4-digit code in the 1000-9999 range. */
function generateOtp(digits = 6) {
  if (digits === 4) {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * WebOTP-compatible message. The final line must be exactly:
 *   @<domain> #<otp>
 */
function buildWebOtpMessage(otp, domain) {
  return `Your PrintQ verification OTP is ${otp}. It will expire in 5 minutes. Do not share your OTP with anyone.\n\n@${domain} #${otp}`;
}. Valid for 5 minutes.\n\n@${domain} #${otp}`;
}

async function sendSmsGateway(mobile, message, otp) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (sid && token && from) {
    const body = new URLSearchParams({
      To: `+91${mobile}`,
      From: from,
      Body: message,
    });
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      throw new Error(`Twilio SMS failed (${response.status}): ${detail}`);
    }
    return { delivery: "sms" };
  }

  const gatewayUrl = process.env.SMS_API_URL;
  if (gatewayUrl) {
    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SMS_API_KEY ? { Authorization: `Bearer ${process.env.SMS_API_KEY}` } : {}),
      },
      body: JSON.stringify({ to: `+91${mobile}`, message, otp }),
    });
    if (!response.ok) throw new Error(`SMS gateway failed (${response.status})`);
    return { delivery: "sms" };
  }

  console.log(`[PrintQ OTP preview] +91${mobile}: ${message.replace(/\n+/g, " | ")}`);
  return { delivery: "preview" };
}

async function handleSendOtp(req, res) {
  const body = await readJsonBody(req);
  const mobile = normalizeMobile(body.mobile);
  if (!/^\d{10}$/.test(mobile)) {
    return sendJson(res, 400, { success: false, error: "Invalid 10-digit mobile number" });
  }

  const now = Date.now();
  const existing = otpStore.get(mobile);
  if (existing && now - existing.sentAt < RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.sentAt)) / 1000);
    return sendJson(res, 429, {
      success: false,
      error: `Please wait ${retryAfter}s before requesting another OTP.`,
      retryAfter,
    });
  }

  const digits = Number(body.digits) === 4 ? 4 : 6;
  const otp = generateOtp(digits);
  const salt = crypto.randomBytes(8).toString("hex");
  otpStore.set(mobile, {
    otpHash: hashOtp(otp, salt),
    salt,
    expiresAt: now + OTP_TTL_MS,
    sentAt: now,
    attempts: 0,
  });

  const message = buildWebOtpMessage(otp, cleanDomain(body.domain));

  try {
    const result = await sendSmsGateway(mobile, message, otp);
    const payload = {
      success: true,
      message: "4-digit OTP sent",
      expiresIn: Math.floor(OTP_TTL_MS / 1000),
      delivery: result.delivery,
    };
    if (result.delivery === "preview") payload.devCode = otp;
    return sendJson(res, 200, payload);
  } catch (error) {
    otpStore.delete(mobile);
    console.error("[PrintQ OTP] SMS delivery failed:", error);
    return sendJson(res, 502, {
      success: false,
      error: "Could not send SMS right now. Please try again.",
    });
  }
}

async function handleVerifyOtp(req, res) {
  const body = await readJsonBody(req);
  const mobile = normalizeMobile(body.mobile);
  const code = String(body.code ?? "").replace(/\D/g, "");

  if (!/^\d{10}$/.test(mobile)) {
    return sendJson(res, 400, { success: false, error: "Invalid 10-digit mobile number" });
  }
  if (!/^\d{4}$/.test(code)) {
    return sendJson(res, 400, { success: false, error: "Enter the 4-digit OTP." });
  }

  const record = otpStore.get(mobile);
  if (!record) {
    return sendJson(res, 400, {
      success: false,
      error: "No OTP request found. Please request a new code.",
    });
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(mobile);
    return sendJson(res, 400, {
      success: false,
      error: "This OTP expired. Please request a new code.",
    });
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(mobile);
    return sendJson(res, 429, {
      success: false,
      error: "Too many incorrect attempts. Please request a new code.",
    });
  }

  record.attempts += 1;
  if (hashOtp(code, record.salt) !== record.otpHash) {
    return sendJson(res, 400, { success: false, error: "Incorrect OTP. Please try again." });
  }

  otpStore.delete(mobile);
  return sendJson(res, 200, {
    success: true,
    message: "Mobile number verified",
    token: crypto.randomUUID(),
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
    res.end();
    return;
  }

  const path = (req.url || "").split("?")[0];
  try {
    if (req.method === "POST" && path === "/api/auth/send-otp") return await handleSendOtp(req, res);
    if (req.method === "POST" && path === "/api/auth/verify-otp") return await handleVerifyOtp(req, res);
    if (req.method === "GET" && path === "/api/health") {
      return sendJson(res, 200, { ok: true, gateway: Boolean(process.env.TWILIO_ACCOUNT_SID || process.env.SMS_API_URL) });
    }
    return sendJson(res, 404, { success: false, error: "Not found" });
  } catch (error) {
    console.error("[PrintQ OTP] Request failed:", error);
    return sendJson(res, 500, { success: false, error: "Server error. Please try again." });
  }
});

server.listen(PORT, () => {
  console.log(`[PrintQ OTP] server listening on http://localhost:${PORT}`);
});
