import { describe, expect, it } from "vitest";
import { calcBmi, estimateBodyFat } from "./bodyfat";

describe("calcBmi", () => {
  it("身長175cm・体重70kgのBMIは約22.9", () => {
    expect(calcBmi(175, 70)).toBeCloseTo(22.86, 2);
  });

  it("身長が0以下ならエラー", () => {
    expect(() => calcBmi(0, 70)).toThrow();
  });

  it("体重が0以下ならエラー", () => {
    expect(() => calcBmi(175, -1)).toThrow();
  });
});

describe("estimateBodyFat", () => {
  it("男性30歳・175cm・70kgは約18.1%", () => {
    // BMI 22.857 → 1.2×22.857 + 0.23×30 − 10.8 − 5.4 = 18.13
    expect(
      estimateBodyFat({ sex: "male", age: 30, heightCm: 175, weightKg: 70 }),
    ).toBeCloseTo(18.1, 1);
  });

  it("女性25歳・160cm・55kgは約26.1%", () => {
    expect(
      estimateBodyFat({ sex: "female", age: 25, heightCm: 160, weightKg: 55 }),
    ).toBeCloseTo(26.1, 1);
  });

  it("同条件なら男性のほうが女性より10.8ポイント低い", () => {
    const male = estimateBodyFat({ sex: "male", age: 40, heightCm: 170, weightKg: 65 });
    const female = estimateBodyFat({ sex: "female", age: 40, heightCm: 170, weightKg: 65 });
    expect(female - male).toBeCloseTo(10.8, 1);
  });

  it("年齢が範囲外ならエラー", () => {
    expect(() =>
      estimateBodyFat({ sex: "male", age: 0, heightCm: 175, weightKg: 70 }),
    ).toThrow();
  });
});
