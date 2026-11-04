/**
 * Utility to strip system prefixes (UUIDs, timestamps, upload hashes)
 * from file names to display a human-readable name in cards, banners, and modals.
 *
 * Example:
 *   "b5474710-9547-42bb-b8c4-5b12d29ccd81-Presentation.pdf" -> "Presentation.pdf"
 *   "1793622842638_Project_Report.pdf" -> "Project_Report.pdf"
 */
export function sanitizeDisplayFileName(name?: string | null): string {
  if (!name || typeof name !== "string") {
    return "Document.pdf";
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return "Document.pdf";
  }

  // 1. Strip standard UUID with trailing hyphen, underscore, or space
  // e.g. "b5474710-9547-42bb-b8c4-5b12d29ccd81-Presentation.pdf"
  let clean = trimmed.replace(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[-_ ]*/,
    ""
  );

  // 2. Strip 32-character hex hash prefix
  clean = clean.replace(/^[0-9a-fA-F]{32}[-_ ]*/, "");

  // 3. Strip timestamp prefix (10-14 digits, e.g. 1793622842638_ or 1793622842-)
  clean = clean.replace(/^\d{10,14}[-_ ]*/, "");

  // 4. Strip leading hyphens, underscores, or spaces
  clean = clean.replace(/^[-_ ]+/, "");

  // 5. If stripping resulted in empty string or just extension, return original
  if (!clean || clean.startsWith(".")) {
    return trimmed;
  }

  return clean;
}

