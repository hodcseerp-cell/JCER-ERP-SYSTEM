/**
 * Returns the current academic year dynamically in "YYYY-YYYY" format.
 * Defaults to current date calculation, or formats a provided year string.
 */
export const getAcademicYear = (customYear?: string): string => {
  if (customYear) return customYear;
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 5 = June
  if (month >= 5) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
};

/**
 * Returns current calendar year automatically from system date for copyright notices.
 */
export const getCopyrightYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Formats any valid date input (ISO string, YYYY-MM-DD, DD/MM/YYYY, Date object, or timestamp)
 * strictly into DD/MM/YYYY format without timezone shifting bugs.
 *
 * Examples:
 * - "2004-09-05" -> "05/09/2004"
 * - "2004-12-25" -> "25/12/2004"
 * - "2004-12-12" -> "12/12/2004"
 * - "05/09/2004" -> "05/09/2004"
 * - "5/9/2004" -> "05/09/2004"
 * - "2004-09-05T00:00:00.000Z" -> "05/09/2004"
 */
export const formatDateDDMMYYYY = (dateVal?: string | Date | number | null): string => {
  if (!dateVal) return '';

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed) return '';

    // Extract date portion before time component (T or space)
    const datePart = trimmed.split(/[T\s]/)[0];

    // Check for YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      const [, y, m, d] = ymdMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }

    // Check for DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = datePart.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }

  // Handle Date instance or numeric timestamp
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return typeof dateVal === 'string' ? dateVal : '';

  // Use UTC values to prevent local timezone offset shifting
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};
