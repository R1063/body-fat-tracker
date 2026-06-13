// localStorage に保存する記録の型とキー。ページ間で共有する。

export interface BodyFatRecord {
  id: string;
  date: string; // YYYY-MM-DD
  percent: number;
  weightKg: number;
}

export const BODYFAT_KEY = "bodyfat-records";
export const GOAL_KEY = "bodyfat-goal";
