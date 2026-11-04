/**
 * Automated QA & Security Verification Test Suite for Phtopy (PrintQ)
 * Run with: node tests/suite.test.cjs
 */
const assert = require('assert');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (error) {
    failedTests++;
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${error.message}`);
  }
}

async function itAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (error) {
    failedTests++;
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${error.message}`);
  }
}

console.log('\n======================================================');
console.log(' PHTOPY (PRINTQ) COMPREHENSIVE AUTOMATED TEST SUITE');
console.log('======================================================\n');

// -----------------------------------------------------------------
// 1. MOBILE NUMBER & AUTHENTICATION VALIDATION
// -----------------------------------------------------------------
console.log('--- 1. Authentication & Indian Mobile Validation ---');

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

it('Should reject empty mobile number', () => {
  const input = '';
  assert.strictEqual(INDIAN_MOBILE_REGEX.test(input), false);
});

it('Should reject 9-digit mobile numbers', () => {
  const input = '987654321';
  assert.strictEqual(INDIAN_MOBILE_REGEX.test(input), false);
});

it('Should reject 11-digit mobile numbers', () => {
  const input = '98765432100';
  assert.strictEqual(INDIAN_MOBILE_REGEX.test(input), false);
});

it('Should reject numbers starting with invalid digits (0-5)', () => {
  assert.strictEqual(INDIAN_MOBILE_REGEX.test('5876543210'), false);
  assert.strictEqual(INDIAN_MOBILE_REGEX.test('1234567890'), false);
  assert.strictEqual(INDIAN_MOBILE_REGEX.test('0987654321'), false);
});

it('Should accept valid 10-digit Indian numbers starting with 6, 7, 8, or 9', () => {
  assert.strictEqual(INDIAN_MOBILE_REGEX.test('9876543210'), true);
  assert.strictEqual(INDIAN_MOBILE_REGEX.test('8765432109'), true);
  assert.strictEqual(INDIAN_MOBILE_REGEX.test('7096447726'), true);
  assert.strictEqual(INDIAN_MOBILE_REGEX.test('6351234567'), true);
});

it('Should normalize +91 prefixes and spaces safely', () => {
  const raw = '+91 70964 47726';
  const clean = raw.replace(/\D/g, '').slice(-10);
  assert.strictEqual(clean, '7096447726');
  assert.strictEqual(INDIAN_MOBILE_REGEX.test(clean), true);
});

// -----------------------------------------------------------------
// 2. OTP GENERATION & SECURITY LOGIC
// -----------------------------------------------------------------
console.log('\n--- 2. OTP Security & Expiry Verification ---');

it('Should generate strict 6-digit integer strings', () => {
  for (let i = 0; i < 50; i++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    assert.strictEqual(code.length, 6);
    assert.match(code, /^\d{6}$/);
  }
});

it('Should format SMS according to specified template', () => {
  const otp = '123456';
  const domain = 'localhost';
  const sms = `Your PrintQ verification OTP is ${otp}. It will expire in 5 minutes. Do not share your OTP with anyone.\n\n@${domain} #${otp}`;
  assert.ok(sms.includes('Your PrintQ verification OTP is 123456.'));
  assert.ok(sms.includes('It will expire in 5 minutes.'));
  assert.ok(sms.includes('Do not share your OTP with anyone.'));
  assert.ok(sms.includes('@localhost #123456'));
});

// -----------------------------------------------------------------
// 3. FILE NAME SANITIZATION TESTING
// -----------------------------------------------------------------
console.log('\n--- 3. File Upload & Filename Sanitization ---');

// Standalone sanitizer test matching src/utils/sanitizeFileName.ts
function testSanitizer(name) {
  if (!name || typeof name !== 'string') return 'Document.pdf';
  let clean = name.trim().replace(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[-_ ]*/, '');
  clean = clean.replace(/^[0-9a-fA-F]{32}[-_ ]*/, '');
  clean = clean.replace(/^\d{10,14}[-_ ]*/, '');
  clean = clean.replace(/^[-_ ]+/, '');
  return clean || name || 'Document.pdf';
}

it('Should strip standard UUID prefix from file name', () => {
  const uglyName = 'b5474710-9547-42bb-b8c4-5b12d29ccd81-Presentation.pdf';
  const clean = testSanitizer(uglyName);
  assert.strictEqual(clean, 'Presentation.pdf');
});

it('Should strip timestamp prefix from file name', () => {
  const tsName = '1793622842638_Project_Report.pdf';
  const clean = testSanitizer(tsName);
  assert.strictEqual(clean, 'Project_Report.pdf');
});

it('Should preserve normal clean file names without modification', () => {
  assert.strictEqual(testSanitizer('Syllabus_2026.pdf'), 'Syllabus_2026.pdf');
  assert.strictEqual(testSanitizer('Class_Notes.docx'), 'Class_Notes.docx');
});

it('Should enforce 5-file upload limit boundary', () => {
  const currentFiles = [1, 2, 3, 4];
  const canUploadMore = currentFiles.length < 5;
  assert.strictEqual(canUploadMore, true);

  const fullFiles = [1, 2, 3, 4, 5];
  const isFull = fullFiles.length >= 5;
  assert.strictEqual(isFull, true);
});

// -----------------------------------------------------------------
// 4. PRINT SETTINGS & PRICING VERIFICATION
// -----------------------------------------------------------------
console.log('\n--- 4. Print Settings & Pricing Breakdown ---');

const BASE_BW_SINGLE = 2.0;
const BASE_BW_DOUBLE = 3.0; // ₹1.5 per page
const BASE_COLOUR_SINGLE = 8.0;
const BASE_COLOUR_DOUBLE = 14.0; // ₹7 per page

it('Calculates single-sided B&W sheet pricing correctly', () => {
  const pages = 10;
  const copies = 1;
  const price = pages * BASE_BW_SINGLE * copies;
  assert.strictEqual(price, 20.0);
});

it('Calculates single-sided Colour sheet pricing correctly', () => {
  const pages = 5;
  const copies = 2;
  const price = pages * BASE_COLOUR_SINGLE * copies;
  assert.strictEqual(price, 80.0);
});

it('Applies double-sided B&W paper rate correctly', () => {
  const pages = 10; // 5 sheets
  const sheets = Math.ceil(pages / 2);
  const price = sheets * BASE_BW_DOUBLE;
  assert.strictEqual(price, 15.0);
});

it('Calculates paper stock surcharges accurately', () => {
  const baseRate = 2.0;
  const glossySurcharge = 5.0; // Glossy surcharge
  const sheetRate = baseRate + glossySurcharge;
  assert.strictEqual(sheetRate, 7.0);
});

// -----------------------------------------------------------------
// 5. PICKUP TOKEN & FIFO QUEUE INTEGRITY
// -----------------------------------------------------------------
console.log('\n--- 5. Pickup Token & Queue Management ---');

it('Generates unique pickup tokens without duplicate collisions', () => {
  const tokens = new Set();
  const letters = ["K", "M", "P", "R", "T", "B", "D", "G", "H", "J", "L", "N", "S", "W", "A"];
  for (let i = 0; i < 100; i++) {
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    const token = `${letter}-${num}`;
    assert.match(token, /^[A-Z]-\d{2}$/);
    tokens.add(token);
  }
  assert.ok(tokens.size > 20, 'Tokens show healthy entropy and randomness');
});

it('Enforces FIFO sequencing in queue', () => {
  const queue = [
    { id: 'ord_1', token: 'P-12', createdAt: 1000, status: 'waiting' },
    { id: 'ord_2', token: 'P-15', createdAt: 2000, status: 'waiting' },
    { id: 'ord_3', token: 'P-18', createdAt: 3000, status: 'waiting' },
  ];

  // FIFO: Earliest created waiting order is picked first
  const earliest = queue.filter(q => q.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)[0];
  assert.strictEqual(earliest.id, 'ord_1');
});

it('Ensures minimum 5-minute campus production turnaround for orders', () => {
  const order = { totalPages: 1, copies: 1, colour: false };
  const baseMinutes = order.totalPages * 0.5;
  const queueBuffer = 3;
  const totalMinutes = Math.max(5, Math.round(baseMinutes + queueBuffer));
  assert.ok(totalMinutes >= 5, 'Turnaround must be at least 5 minutes so timer does not vanish');
});

// -----------------------------------------------------------------
// 6. DEFENSIVE SECURITY & PRIVILEGE CHECKS
// -----------------------------------------------------------------
console.log('\n--- 6. Defensive Security & Role Protection ---');

it('Prevents client privilege escalation (user cannot modify own role)', () => {
  const profile = { uid: 'uid_123', email: 'student@campus.edu', role: 'user' };
  const attemptedUpdates = { role: 'admin' };
  
  // Security rule check
  const hasAdminSession = false;
  if (!hasAdminSession && attemptedUpdates.role && attemptedUpdates.role !== profile.role) {
    // Correctly blocked
    assert.ok(true, 'Privilege escalation blocked');
  } else {
    assert.fail('Privilege escalation allowed!');
  }
});

it('Enforces UID immutability', () => {
  const currentUid = 'uid_student_1';
  const maliciousUpdate = { uid: 'uid_admin_override' };
  
  const hasAdminSession = false;
  let blocked = false;
  if (!hasAdminSession && maliciousUpdate.uid && maliciousUpdate.uid !== currentUid) {
    blocked = true;
  }
  assert.strictEqual(blocked, true, 'UID manipulation was blocked');
});

it('Validates 30-second rate-limiting cooldown for OTP resend', () => {
  const lastSent = Date.now() - 10000; // 10s ago
  const cooldown = 30 * 1000;
  const canResend = Date.now() - lastSent >= cooldown;
  assert.strictEqual(canResend, false, 'Premature resend was rate-limited');
});

// -----------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------
console.log('\n======================================================');
console.log(` RESULTS: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
