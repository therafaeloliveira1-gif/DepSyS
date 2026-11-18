/**
 * DepSyS - Utilidades de Formato Regional Paraguay
 * Reglas aplicadas:
 * - formato_fechas.md: Formato obligatorio DD/MM/AAAA con barra '/'.
 * - ponytail.md: Código senior pragmático, nativo, YAGNI, sin dependencias externas.
 */

export function formatDatePY(value, includeTime = false) {
  if (!value) return '';

  // Parseo regex directo para cadenas YYYY-MM-DD para prevenir desfase UTC en Date()
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (match) {
      const [, y, m, d, hh, mm] = match;
      const datePart = `${d}/${m}/${y}`;
      if (includeTime && hh && mm) {
        return `${datePart} ${hh}:${mm}`;
      }
      return datePart;
    }
  }

  const dObj = value instanceof Date ? value : new Date(value);
  if (isNaN(dObj.getTime())) return String(value);

  const day = String(dObj.getDate()).padStart(2, '0');
  const month = String(dObj.getMonth() + 1).padStart(2, '0');
  const year = dObj.getFullYear();
  const datePart = `${day}/${month}/${year}`;

  if (includeTime) {
    const hours = String(dObj.getHours()).padStart(2, '0');
    const minutes = String(dObj.getMinutes()).padStart(2, '0');
    return `${datePart} ${hours}:${minutes}`;
  }

  return datePart;
}

export function formatTimePY(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/(?:[T\s]|^)(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
  }
  const dObj = value instanceof Date ? value : new Date(value);
  if (isNaN(dObj.getTime())) return '';
  return dObj.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
}
