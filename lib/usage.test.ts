import { describe, expect, it } from "vitest";
import { AI_FREE_LIMIT, canUseFree, remainingUses } from "./usage";

describe("remainingUses", () => {
  it("未使用なら無料上限と同じ", () => {
    expect(remainingUses(0)).toBe(AI_FREE_LIMIT);
  });

  it("1回使うと残りは2", () => {
    expect(remainingUses(1)).toBe(2);
  });

  it("上限まで使うと残り0", () => {
    expect(remainingUses(AI_FREE_LIMIT)).toBe(0);
  });

  it("上限を超えても0でとどまる", () => {
    expect(remainingUses(AI_FREE_LIMIT + 5)).toBe(0);
  });
});

describe("canUseFree", () => {
  it("未使用なら使える", () => {
    expect(canUseFree(0)).toBe(true);
  });

  it("上限の1回前までは使える", () => {
    expect(canUseFree(AI_FREE_LIMIT - 1)).toBe(true);
  });

  it("上限に達したら使えない", () => {
    expect(canUseFree(AI_FREE_LIMIT)).toBe(false);
  });
});
