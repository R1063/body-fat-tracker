// AI画像推定の無料お試し回数を管理する純粋ロジック。
// 実際の保存は localStorage(storage.ts)で行い、ここでは計算だけを扱う。

export const AI_FREE_LIMIT = 3;
export const AI_USAGE_KEY = "ai-estimate-usage";
export const AI_CONSENT_KEY = "ai-estimate-consent";

/** 残りの無料回数(0未満にはならない) */
export function remainingUses(used: number): number {
  return Math.max(AI_FREE_LIMIT - used, 0);
}

/** まだ無料で使えるか */
export function canUseFree(used: number): boolean {
  return used < AI_FREE_LIMIT;
}
