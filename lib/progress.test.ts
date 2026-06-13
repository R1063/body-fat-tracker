import { describe, expect, it } from "vitest";
import type { BodyFatRecord } from "./records";
import { filterByRange, goalProgress } from "./progress";

function record(date: string, percent: number): BodyFatRecord {
  return { id: date, date, percent, weightKg: 70 };
}

describe("filterByRange", () => {
  const now = new Date("2026-06-12T12:00:00");
  const records = [
    record("2026-06-12", 18),
    record("2026-06-08", 19),
    record("2026-05-20", 20),
    record("2025-12-01", 22),
    record("2024-01-01", 25),
  ];

  it("週: 直近7日の記録だけを返す", () => {
    const result = filterByRange(records, "week", now);
    expect(result.map((r) => r.date)).toEqual(["2026-06-08", "2026-06-12"]);
  });

  it("月: 直近30日の記録を日付昇順で返す", () => {
    const result = filterByRange(records, "month", now);
    expect(result.map((r) => r.date)).toEqual([
      "2026-05-20",
      "2026-06-08",
      "2026-06-12",
    ]);
  });

  it("年: 直近365日の記録を返す", () => {
    const result = filterByRange(records, "year", now);
    expect(result).toHaveLength(4);
  });

  it("記録が空なら空配列", () => {
    expect(filterByRange([], "week", now)).toEqual([]);
  });
});

describe("goalProgress", () => {
  it("開始25%・現在20%・目標15%なら達成度50%", () => {
    expect(goalProgress(25, 20, 15)).toBe(50);
  });

  it("目標に到達していれば100%", () => {
    expect(goalProgress(25, 15, 15)).toBe(100);
  });

  it("目標を超えても100%でとどまる", () => {
    expect(goalProgress(25, 12, 15)).toBe(100);
  });

  it("開始より悪化していれば0%", () => {
    expect(goalProgress(25, 27, 15)).toBe(0);
  });

  it("開始と目標が同じで現在も同じなら100%", () => {
    expect(goalProgress(15, 15, 15)).toBe(100);
  });
});
