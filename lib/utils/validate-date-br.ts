/**
 * Validates a date string in DD/MM/YYYY or YYYY-MM-DD format.
 * Checks for overflow (e.g., Feb 30 is invalid).
 *
 * @param val - Date string to validate
 * @returns true if valid date or empty string
 */
export function isValidDateBr(val: string): boolean {
  if (val === '') return true;

  const ddmmyyyy = /^\d{2}\/\d{2}\/\d{4}$/.test(val);
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(val);
  if (!ddmmyyyy && !isoDate) return false;

  let day: number, month: number, year: number;

  if (ddmmyyyy) {
    const parts = val.split('/');
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    const parts = val.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  }

  // Build date and check for overflow
  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}
