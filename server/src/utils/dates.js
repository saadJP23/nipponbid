function normalizeDate(value) {
  if (value == null || value === '') return null;
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

module.exports = { normalizeDate };
