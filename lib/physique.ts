// 姿勢検出(MoveNet)で得たキーポイントから体型の特徴を計算する純粋ロジック。
// 実際の推論は端末内(ブラウザ)で行い、ここでは座標の計算だけを扱うのでテストしやすい。

export interface Keypoint {
  name?: string;
  x: number;
  y: number;
  score?: number;
}

export interface Physique {
  shoulderWidth: number;
  hipWidth: number;
  /** 肩幅 ÷ 腰幅。体型の特徴をあらわす無次元の比。 */
  shoulderHipRatio: number;
}

/** このスコア未満のキーポイントは信頼できないものとして無視する */
export const MIN_SCORE = 0.3;

/** 体型計算に必要な4点(両肩・両腰)の名前 */
export const REQUIRED_POINTS = [
  "left_shoulder",
  "right_shoulder",
  "left_hip",
  "right_hip",
] as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 名前で信頼できるキーポイントを取り出す。低スコアや欠損は null。 */
export function getPoint(keypoints: Keypoint[], name: string): Keypoint | null {
  const p = keypoints.find((k) => k.name === name);
  if (!p || (p.score ?? 0) < MIN_SCORE) return null;
  return p;
}

/** 体型を計算できるだけのキーポイント(両肩・両腰)がそろっているか */
export function hasUsableBody(keypoints: Keypoint[]): boolean {
  return REQUIRED_POINTS.every((name) => getPoint(keypoints, name) != null);
}

function dist(a: Keypoint, b: Keypoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** キーポイントから肩幅・腰幅・肩腰比を計算する。計算できなければ null。 */
export function computePhysique(keypoints: Keypoint[]): Physique | null {
  const ls = getPoint(keypoints, "left_shoulder");
  const rs = getPoint(keypoints, "right_shoulder");
  const lh = getPoint(keypoints, "left_hip");
  const rh = getPoint(keypoints, "right_hip");
  if (!ls || !rs || !lh || !rh) return null;

  const shoulderWidth = dist(ls, rs);
  const hipWidth = dist(lh, rh);
  if (hipWidth === 0) return null;

  return {
    shoulderWidth: round2(shoulderWidth),
    hipWidth: round2(hipWidth),
    shoulderHipRatio: round2(shoulderWidth / hipWidth),
  };
}

/** 実験的補正の基準となる肩腰比。これより腰が広いと推定をやや上げ、狭いと下げる。 */
export const REFERENCE_RATIO = 1.4;
const ADJUST_GAIN = 4;
const MAX_ADJUST = 2;

/**
 * 写真から得た肩腰比で推定値を実験的に補正する(要件定義の第1段階)。
 * ※ これは検証された手法ではなく、補正幅は ±2ポイントに制限している。
 * 精度の向上には実測データでの学習(第2・第3段階)が必要。
 */
export function experimentalEstimate(
  basePercent: number,
  shoulderHipRatio: number,
): number {
  const raw = (REFERENCE_RATIO - shoulderHipRatio) * ADJUST_GAIN;
  const adjust = Math.min(Math.max(raw, -MAX_ADJUST), MAX_ADJUST);
  const adjusted = Math.min(Math.max(basePercent + adjust, 1), 75);
  return Math.round(adjusted * 10) / 10;
}
