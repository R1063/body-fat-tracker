export type Sex = "male" | "female";

export interface BodyFatInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
}

export function calcBmi(heightCm: number, weightKg: number): number {
  if (heightCm <= 0 || weightKg <= 0) {
    throw new Error("身長と体重は正の数で入力してください");
  }
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * Deurenberg の推定式による体脂肪率の概算。
 * 体脂肪率(%) = 1.20 × BMI + 0.23 × 年齢 − 10.8 × 性別(男性1, 女性0) − 5.4
 * あくまで統計的な推定値であり、体組成計などの実測値とは差が出る。
 */
export function estimateBodyFat({ sex, age, heightCm, weightKg }: BodyFatInput): number {
  if (age <= 0 || age > 120) {
    throw new Error("年齢は1〜120の範囲で入力してください");
  }
  const bmi = calcBmi(heightCm, weightKg);
  const sexFactor = sex === "male" ? 1 : 0;
  const percent = 1.2 * bmi + 0.23 * age - 10.8 * sexFactor - 5.4;
  const clamped = Math.min(Math.max(percent, 1), 75);
  return Math.round(clamped * 10) / 10;
}
