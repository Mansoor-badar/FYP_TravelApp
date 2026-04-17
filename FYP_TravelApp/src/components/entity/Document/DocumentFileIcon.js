/**
 * DocumentFileIcon
 *
 * Shared helpers for deriving a file-type extension badge from a filename or
 * storage path.  Previously duplicated identically in DocumentItem.js and
 * DocumentViewScreen.js — now the single source of truth.
 *
 * Exports:
 *   getExtension(str)  – returns the uppercased extension, e.g. "PDF"
 *   extColor(ext)      – returns { bg, color } for a badge background / text
 *   EXT_COLORS         – the raw lookup table (in case consumers need it)
 */

export const EXT_COLORS = {
  PDF:  { bg: "#fee2e2", color: "#b91c1c" },
  JPG:  { bg: "#dbeafe", color: "#1d4ed8" },
  JPEG: { bg: "#dbeafe", color: "#1d4ed8" },
  PNG:  { bg: "#d1fae5", color: "#065f46" },
  DOC:  { bg: "#ede9fe", color: "#5b21b6" },
  DOCX: { bg: "#ede9fe", color: "#5b21b6" },
  DEFAULT: { bg: "#f3f4f6", color: "#374151" },
};

/**
 * getExtension
 * @param {string} filePathOrName  – e.g. "visa_document.pdf" or storage path
 * @returns {string}  uppercase extension, e.g. "PDF", or "FILE" as fallback
 */
export const getExtension = (filePathOrName = "") => {
  const parts = filePathOrName.split(".");
  if (parts.length < 2) return "FILE";
  return parts[parts.length - 1].toUpperCase().slice(0, 5);
};

/**
 * extColor
 * @param {string} ext  – uppercase extension from getExtension()
 * @returns {{ bg: string, color: string }}
 */
export const extColor = (ext) => EXT_COLORS[ext] ?? EXT_COLORS.DEFAULT;
