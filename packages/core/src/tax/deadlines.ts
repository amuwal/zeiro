import type { ClientProfile } from '../schemas/client';

// Derived Japanese tax deadlines, grounded in a client's 決算月 / 事業形態 /
// 課税区分. These are the *principle* (原則) deadlines — the drafting agent must
// present them as general guidance and defer specifics (延長特例・中間申告・土日順延)
// to the 税理士. `date` is null for recurring obligations with no single next date.
export type TaxDeadline = {
  label: string;
  date: string | null; // 'YYYY-MM-DD'
  daysUntil: number | null;
  basis: string;
};

function lastDayOfMonthUTC(year: number, month1to12: number): Date {
  return new Date(Date.UTC(year, month1to12, 0));
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(today: Date, target: Date): number {
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const t1 = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.round((t1 - t0) / 86_400_000);
}

function nextMonthDay(today: Date, month1to12: number, day: number): Date {
  const y = today.getUTCFullYear();
  const thisYear = new Date(Date.UTC(y, month1to12 - 1, day));
  return daysBetween(today, thisYear) >= 0
    ? thisYear
    : new Date(Date.UTC(y + 1, month1to12 - 1, day));
}

function nextMonthEnd(today: Date, month1to12: number): Date {
  const y = today.getUTCFullYear();
  const thisYear = lastDayOfMonthUTC(y, month1to12);
  return daysBetween(today, thisYear) >= 0 ? thisYear : lastDayOfMonthUTC(y + 1, month1to12);
}

function withDays(today: Date, label: string, date: Date, basis: string): TaxDeadline {
  return { label, date: fmt(date), daysUntil: daysBetween(today, date), basis };
}

export function computeTaxDeadlines(profile: ClientProfile, today: Date): TaxDeadline[] {
  const out: TaxDeadline[] = [];

  if (profile.entityType === 'sole_proprietor') {
    out.push(
      withDays(
        today,
        '所得税の確定申告',
        nextMonthDay(today, 3, 15),
        '個人の所得税確定申告・納付期限 (原則3月15日)',
      ),
    );
    if (profile.consumptionTax && profile.consumptionTax !== 'exempt') {
      out.push(
        withDays(
          today,
          '消費税の確定申告',
          nextMonthDay(today, 3, 31),
          '個人事業者の消費税申告・納付期限 (原則3月31日)',
        ),
      );
    }
  } else if (typeof profile.fiscalMonth === 'number') {
    // 法人税・地方法人税・消費税の確定申告: 事業年度終了日の翌日から2ヶ月以内 (原則)。
    let deadlineMonth = profile.fiscalMonth + 2;
    if (deadlineMonth > 12) deadlineMonth -= 12;
    out.push({
      ...withDays(
        today,
        '法人税・消費税の確定申告',
        nextMonthEnd(today, deadlineMonth),
        `事業年度終了日 (${profile.fiscalMonth}月末) の翌日から2ヶ月以内が原則`,
      ),
    });
  }

  if (profile.withholding === true) {
    out.push({
      label: '源泉所得税の納付',
      date: null,
      daysUntil: null,
      basis:
        '原則として支払月の翌月10日。納期の特例適用時は年2回 (1〜6月分→7月10日 / 7〜12月分→翌1月20日)',
    });
    out.push(
      withDays(
        today,
        '法定調書・給与支払報告書の提出',
        nextMonthDay(today, 1, 31),
        '前年分の法定調書合計表・給与支払報告書の提出期限 (1月31日)',
      ),
    );
  }

  return out;
}
