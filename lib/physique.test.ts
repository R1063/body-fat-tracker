import { describe, expect, it } from "vitest";
import {
  type Keypoint,
  REFERENCE_RATIO,
  computePhysique,
  experimentalEstimate,
  getPoint,
  hasUsableBody,
} from "./physique";

// 肩幅100・腰幅80(肩腰比1.25)の単純な人物
function sampleBody(score = 0.9): Keypoint[] {
  return [
    { name: "left_shoulder", x: 0, y: 0, score },
    { name: "right_shoulder", x: 100, y: 0, score },
    { name: "left_hip", x: 10, y: 100, score },
    { name: "right_hip", x: 90, y: 100, score },
  ];
}

describe("getPoint", () => {
  it("信頼できる点を取り出せる", () => {
    expect(getPoint(sampleBody(), "left_hip")?.x).toBe(10);
  });

  it("スコアが低い点は無視する", () => {
    expect(getPoint(sampleBody(0.1), "left_hip")).toBeNull();
  });

  it("存在しない点は null", () => {
    expect(getPoint(sampleBody(), "nose")).toBeNull();
  });
});

describe("hasUsableBody", () => {
  it("両肩・両腰がそろえば true", () => {
    expect(hasUsableBody(sampleBody())).toBe(true);
  });

  it("腰が欠けると false", () => {
    const kp = sampleBody().filter((k) => !k.name?.includes("hip"));
    expect(hasUsableBody(kp)).toBe(false);
  });

  it("全身が低スコアなら false", () => {
    expect(hasUsableBody(sampleBody(0.1))).toBe(false);
  });
});

describe("computePhysique", () => {
  it("肩幅・腰幅・肩腰比を計算する", () => {
    const p = computePhysique(sampleBody());
    expect(p).not.toBeNull();
    expect(p!.shoulderWidth).toBe(100);
    expect(p!.hipWidth).toBe(80);
    expect(p!.shoulderHipRatio).toBe(1.25);
  });

  it("キーポイントが足りなければ null", () => {
    expect(computePhysique([])).toBeNull();
  });
});

describe("experimentalEstimate", () => {
  it("基準比なら補正なし", () => {
    expect(experimentalEstimate(20, REFERENCE_RATIO)).toBe(20);
  });

  it("腰が広い(比が小さい)と推定が上がる", () => {
    expect(experimentalEstimate(20, 1.15)).toBeCloseTo(21, 5); // (1.4-1.15)*4 = +1.0
  });

  it("肩が広い(比が大きい)と推定が下がる", () => {
    expect(experimentalEstimate(20, 1.65)).toBeCloseTo(19, 5); // (1.4-1.65)*4 = -1.0
  });

  it("補正幅は ±2ポイントに制限される", () => {
    expect(experimentalEstimate(20, 0.5)).toBe(22); // raw +3.6 → +2 に制限
    expect(experimentalEstimate(20, 2.5)).toBe(18); // raw -4.4 → -2 に制限
  });

  it("補正後も1〜75%に収まる", () => {
    expect(experimentalEstimate(1, 0.5)).toBeGreaterThanOrEqual(1);
    expect(experimentalEstimate(74.5, 0.5)).toBeLessThanOrEqual(75);
  });
});
