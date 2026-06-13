import type { BodyFatRecord } from "./records";

export type Range = "week" | "month" | "year";

export const RANGE_DAYS: Record<Range, number> = {
  week: 7,
  month: 30,
  year: 365,
};

export const RANGE_LABELS: Record<Range, string> = {
  week: "週",
  month: "月",
  year: "年",
};

/** 指定期間内の記録を日付の昇順で返す */
export function filterByRange(
  records: BodyFatRecord[],
  range: Range,
  now: Date = new Date(),
): BodyFatRecord[] {
  const limit = new Date(now);
  limit.setDate(limit.getDate() - RANGE_DAYS[range]);
  return records
    .filter((r) => {
      const d = new Date(`${r.date}T00:00:00`);
      return d >= limit && d <= now;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 目標への達成度(0〜100%)。
 * 開始値から目標値までの距離のうち、現在値まででどれだけ進んだか。
 */
export function goalProgress(
  startPercent: number,
  currentPercent: number,
  goalPercent: number,
): number {
  const total = startPercent - goalPercent;
  if (total === 0) {
    return currentPercent === goalPercent ? 100 : 0;
  }
  const done = startPercent - currentPercent;
  const ratio = (done / total) * 100;
  return Math.min(Math.max(Math.round(ratio), 0), 100);
}
