const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return formatHHmm(date);

  const diffMs = now.getTime() - date.getTime();
  if (diffMs >= 0 && diffMs < 2 * ONE_DAY_MS && date.getDate() === now.getDate() - 1) {
    return '昨日';
  }
  if (diffMs >= 0 && diffMs < 7 * ONE_DAY_MS) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatFullJST(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${formatHHmm(date)}`;
}

export function formatHHmm(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function makeInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+|　/).filter(Boolean);
  if (parts.length >= 2) {
    return takeChar(parts[0]) + takeChar(parts[parts.length - 1]);
  }
  return takeChar(trimmed, 2);
}

export function makePreview(body: string, max = 80): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function takeChar(s: string, count = 1): string {
  return Array.from(s).slice(0, count).join('').toUpperCase();
}
