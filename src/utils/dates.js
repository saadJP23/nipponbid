export function toDateInputValue(value) {
  if (value == null || value === '') return '';

  if (typeof value === 'string') {
    const plain = value.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (plain) return plain[1];

    if (/^\d{4}-\d{2}-\d{2}[T ]/.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${mo}-${day}`;
      }
      const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : '';
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const mo = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
  }

  return '';
}

export function normalizeDateField(value) {
  const d = toDateInputValue(value);
  return d || null;
}
