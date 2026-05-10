export type AnalyticsWindow = 'today' | '7d' | '30d' | 'quarter';

export type DateRange = { start: Date; end: Date };

export type WindowResolution = {
  window: AnalyticsWindow;
  current: DateRange;
  previous: DateRange;
  bucket: 'hour' | 'day' | 'week';
  bucketCount: number;
  label: string;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function parseWindow(input: string | undefined): AnalyticsWindow {
  if (input === 'today' || input === '7d' || input === '30d' || input === 'quarter') {
    return input;
  }
  return '30d';
}

export function resolveWindow(input: string | undefined, now: Date = new Date()): WindowResolution {
  const window = parseWindow(input);
  switch (window) {
    case 'today': {
      const startToday = startOfDay(now);
      return {
        window,
        current: { start: startToday, end: now },
        previous: {
          start: new Date(startToday.getTime() - DAY_MS),
          end: startToday,
        },
        bucket: 'hour',
        bucketCount: 24,
        label: '本日',
      };
    }
    case '7d':
      return makeBackwardWindow(now, 7, 'day', '直近 7 日', window);
    case '30d':
      return makeBackwardWindow(now, 30, 'day', '直近 30 日', window);
    case 'quarter':
      return makeBackwardWindow(now, 90, 'week', '直近 90 日', window);
  }
}

function makeBackwardWindow(
  now: Date,
  days: number,
  bucket: 'day' | 'week',
  label: string,
  window: AnalyticsWindow,
): WindowResolution {
  const end = now;
  const start = new Date(end.getTime() - days * DAY_MS);
  const prevEnd = start;
  const prevStart = new Date(prevEnd.getTime() - days * DAY_MS);
  const bucketCount = bucket === 'day' ? days : Math.ceil(days / 7);
  return {
    window,
    current: { start, end },
    previous: { start: prevStart, end: prevEnd },
    bucket,
    bucketCount,
    label,
  };
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
