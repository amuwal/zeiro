export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === 'object') {
    try {
      str = JSON.stringify(value);
    } catch {
      str = '';
    }
  } else {
    str = String(value);
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',');
}
