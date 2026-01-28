/**
 * Format date as DD-MMM-YYYY (e.g. 01-Jan-2026) for display/export.
 * @param {string|Date|null} dateStr - Date string (YYYY-MM-DD or ISO) or Date
 * @returns {string}
 */
function formatDisplayDate(dateStr) {
  if (dateStr == null || dateStr === '') return '';
  const s = String(dateStr).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return String(dateStr);
  const [y, m, d] = s.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d).padStart(2, '0')}-${months[m - 1]}-${y}`;
}

module.exports = { formatDisplayDate };
