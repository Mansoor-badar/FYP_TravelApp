/**
 * DateUtils
 *
 * Shared date/time formatting helpers. All functions operate on UTC so that
 * timestamptz values from the database (returned as ISO-8601 strings) are
 * displayed without local-timezone shifts — e.g. a trip stored as
 * "2026-05-01T00:00:00+00:00" always renders as 2026-05-01 regardless of the
 * device's locale.
 */

const pad = (n) => (n < 10 ? "0" + n : n);

/**
 * endOfUTCDay
 *
 * Returns a new Date set to 23:59:59.999 UTC on the same calendar day as the
 * given ISO string. Use this when comparing an end_date stored as a timestamptz
 * so that a trip is only considered "ended" after the full UTC day has passed,
 * not at whatever time the timestamp happens to record.
 *
 * Returns null for falsy or unparseable input.
 *
 * @param {string} iso
 * @returns {Date|null}
 */
export const endOfUTCDay = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

/**
 * formatDate
 *
 * Converts a timestamptz / ISO date string to a YYYY-MM-DD display string.
 * Returns null for falsy or unparseable input.
 *
 * @param {string} iso – e.g. "2026-05-01T00:00:00+00:00" or "2026-05-01"
 * @returns {string|null}
 */
export const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/**
 * formatDateTime
 *
 * Converts a timestamptz / ISO datetime string to a "YYYY-MM-DD  HH:MM"
 * display string. Returns "—" for falsy input and the raw value for
 * unparseable input.
 *
 * @param {string} iso – e.g. "2026-05-01T10:30:00+00:00"
 * @returns {string}
 */
export const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}  ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
