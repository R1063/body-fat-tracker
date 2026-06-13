"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { estimateBodyFat, type Sex } from "@/lib/bodyfat";
import { BODYFAT_KEY, type BodyFatRecord } from "@/lib/records";
import {
  type Keypoint,
  type Physique,
  MIN_SCORE,
  computePhysique,
  experimentalEstimate,
  getPoint,
  hasUsableBody,
} from "@/lib/physique";
import {
  AI_CONSENT_KEY,
  AI_FREE_LIMIT,
  AI_USAGE_KEY,
  canUseFree,
  remainingUses,
} from "@/lib/usage";
import { loadList, loadValue, saveList, saveValue } from "@/lib/storage";

const MAX_CANVAS_WIDTH = 320;

// 端末内で姿勢検出を行うための detector を使い回す。
// 動的importで読み込むので tfjs は AI推定ページを開いたときだけダウンロードされる。
let detectorPromise: Promise<{
  estimatePoses: (img: HTMLCanvasElement) => Promise<{ keypoints: Keypoint[] }[]>;
}> | null = null;

async function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const tf = await import("@tensorflow/tfjs-core");
      await import("@tensorflow/tfjs-backend-webgl");
      const poseDetection = await import("@tensorflow-models/pose-detection");
      await tf.ready();
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      });
    })();
  }
  return detectorPromise;
}

function drawOverlay(canvas: HTMLCanvasElement, keypoints: Keypoint[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const pairs: [string, string][] = [
    ["left_shoulder", "right_shoulder"],
    ["left_hip", "right_hip"],
    ["left_shoulder", "left_hip"],
    ["right_shoulder", "right_hip"],
  ];
  ctx.strokeStyle = "#38a169";
  ctx.lineWidth = 3;
  for (const [a, b] of pairs) {
    const pa = getPoint(keypoints, a);
    const pb = getPoint(keypoints, b);
    if (pa && pb) {
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#2b6cb0";
  for (const k of keypoints) {
    if ((k.score ?? 0) >= MIN_SCORE) {
      ctx.beginPath();
      ctx.arc(k.x, k.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

type Analysis =
  | { state: "idle" }
  | { state: "analyzing" }
  | { state: "done"; detected: boolean; physique: Physique | null }
  | { state: "error"; message: string };

export default function AiEstimatePage() {
  const [loaded, setLoaded] = useState(false);
  const [consented, setConsented] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [used, setUsed] = useState(0);

  const [hasPhoto, setHasPhoto] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis>({ state: "idle" });
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [result, setResult] = useState<{ base: number; experimental: number | null } | null>(
    null,
  );
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setConsented(loadValue<boolean>(AI_CONSENT_KEY) === true);
    setUsed(loadValue<number>(AI_USAGE_KEY) ?? 0);
    setLoaded(true);
  }, []);

  function agreeConsent() {
    if (!consentChecked) return;
    setConsented(true);
    saveValue(AI_CONSENT_KEY, true);
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const scale = Math.min(MAX_CANVAS_WIDTH / img.width, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasPhoto(true);
        void analyzePhoto(canvas);
      };
      img.src = typeof reader.result === "string" ? reader.result : "";
    };
    reader.readAsDataURL(file);
  }

  async function analyzePhoto(canvas: HTMLCanvasElement) {
    setAnalysis({ state: "analyzing" });
    try {
      const detector = await getDetector();
      const poses = await detector.estimatePoses(canvas);
      const keypoints = poses[0]?.keypoints ?? [];
      const detected = hasUsableBody(keypoints);
      if (detected) drawOverlay(canvas, keypoints);
      setAnalysis({
        state: "done",
        detected,
        physique: detected ? computePhysique(keypoints) : null,
      });
    } catch {
      setAnalysis({
        state: "error",
        message: "端末内のAIモデルを読み込めませんでした。推定は入力値のみで行います。",
      });
    }
  }

  function estimate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!canUseFree(used)) return;
    if (!hasPhoto) {
      setError("写真を選択してください");
      return;
    }
    try {
      const base = estimateBodyFat({
        sex,
        age: Number(age),
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
      });
      const physique = analysis.state === "done" ? analysis.physique : null;
      const experimental = physique
        ? experimentalEstimate(base, physique.shoulderHipRatio)
        : null;
      setResult({ base, experimental });
      const next = used + 1;
      setUsed(next);
      saveValue(AI_USAGE_KEY, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "推定できませんでした");
    }
  }

  function saveResult() {
    if (!result) return;
    const history = loadList<BodyFatRecord>(BODYFAT_KEY);
    const record: BodyFatRecord = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleDateString("sv-SE"),
      percent: result.experimental ?? result.base,
      weightKg: Number(weightKg),
    };
    saveList(BODYFAT_KEY, [record, ...history]);
    setResult(null);
    setHasPhoto(false);
    setAnalysis({ state: "idle" });
    if (fileRef.current) fileRef.current.value = "";
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (!loaded) return null;

  const remaining = remainingUses(used);

  // --- 同意ゲート ---
  if (!consented) {
    return (
      <>
        <h1>AI画像推定(β版)</h1>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>ご利用の前に</h2>
          <ul style={{ paddingLeft: 18, fontSize: 14 }}>
            <li>これは開発中の <strong>β版</strong> です。推定値は実測値と差が出ます。</li>
            <li>
              選択した写真は <strong>この端末のブラウザ内だけ</strong> で処理され、
              サーバーへ送信・保存されることはありません。
            </li>
            <li>
              写真からは姿勢検出AIで体型の特徴(肩幅・腰幅の比)を抽出し、推定の参考にします。
              ただしこの補正は実験的なもので、科学的に検証されたものではありません。
            </li>
            <li>無料でお試しいただけるのは <strong>{AI_FREE_LIMIT}回</strong> までです。</li>
          </ul>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
            />
            上記に同意します
          </label>
          <button
            className="btn"
            type="button"
            style={{ marginTop: 12 }}
            disabled={!consentChecked}
            onClick={agreeConsent}
          >
            同意して進む
          </button>
        </div>
        <p className="note">
          詳しくは<Link href="/legal/terms">利用規約</Link>・
          <Link href="/legal/privacy">プライバシーポリシー</Link>をご確認ください。
        </p>
      </>
    );
  }

  const exhausted = remaining === 0;

  return (
    <>
      <h1>AI画像推定(β版)</h1>

      <div className="card" style={{ background: "#fffaf0", borderLeft: "4px solid #dd6b20" }}>
        <p style={{ margin: 0, fontSize: 14 }}>
          📷 <strong>β版のお知らせ</strong>
          <br />
          写真は端末内の姿勢検出AIで解析し、体型の特徴を推定の参考にします。
          実験的な補正であり、精度向上には今後のデータ学習が必要です。
        </p>
      </div>

      <p className="note">
        無料お試し: 残り <strong>{remaining}</strong> / {AI_FREE_LIMIT} 回
      </p>

      {exhausted ? (
        <div className="card">
          <p>
            無料お試し({AI_FREE_LIMIT}回)を使い切りました。
            <br />
            継続してご利用いただける有料プランは、今後のスプリントで導入予定です。
          </p>
          <p className="note">
            <Link href="/bodyfat">体脂肪率ページ</Link>では引き続き無料で推定できます。
          </p>
        </div>
      ) : (
        <>
        <details className="guide card">
          <summary>📸 写真を撮るコツ(タップで開く)</summary>
          <ul>
            <li>
              <strong>正面・全身</strong>:頭からつま先までフレームに入れ、まっすぐ正面を向く
            </li>
            <li>
              <strong>カメラの高さ</strong>:腰くらいの高さで床と垂直に。床置き＋タイマー撮影が安定します
            </li>
            <li>
              <strong>服装をそろえる</strong>:体にフィットした服、または毎回同じ服装に。
              脱ぐ量で結果が変わるため、条件を一定にするのがコツです
            </li>
            <li>
              <strong>明るく・背景はシンプル</strong>:明るい場所で、無地の壁を背にすると検出が安定します
            </li>
            <li>
              <strong>毎回同じ条件で</strong>:距離・服装・明るさをそろえると、
              絶対値より大事な「変化」を比べられます
            </li>
          </ul>
          <p className="note">
            β版では1枚の写真から正確な体脂肪率は出せません。
            同じ条件で撮って「変化」を追うのがおすすめです。
          </p>
        </details>
        <form className="card" onSubmit={estimate}>
          <div className="field">
            <label htmlFor="photo">全身が写った写真を選択</label>
            <input
              id="photo"
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
            />
          </div>

          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              borderRadius: 8,
              marginBottom: 8,
              display: hasPhoto ? "block" : "none",
              background: "#edf2f7",
            }}
          />

          {analysis.state === "analyzing" && (
            <p className="note">🔍 写真を解析しています…(初回はモデルの読み込みに数秒かかります)</p>
          )}
          {analysis.state === "done" && analysis.detected && analysis.physique && (
            <div style={{ fontSize: 13, color: "#2f855a", marginBottom: 8 }}>
              ✅ 全身を検出しました(肩幅:腰幅の比 = {analysis.physique.shoulderHipRatio})
            </div>
          )}
          {analysis.state === "done" && !analysis.detected && (
            <div style={{ fontSize: 13, color: "#c05621", marginBottom: 8 }}>
              ⚠️ 全身(両肩・両腰)をはっきり検出できませんでした。正面・全身の写真だと精度が上がります。入力値のみでも推定できます。
            </div>
          )}
          {analysis.state === "error" && (
            <div style={{ fontSize: 13, color: "#c05621", marginBottom: 8 }}>
              ⚠️ {analysis.message}
            </div>
          )}

          <div className="row">
            <div className="field">
              <label htmlFor="sex">性別</label>
              <select id="sex" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                <option value="male">男性</option>
                <option value="female">女性</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="age">年齢</label>
              <input
                id="age"
                type="number"
                min="1"
                max="120"
                placeholder="30"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="height">身長 (cm)</label>
              <input
                id="height"
                type="number"
                min="50"
                max="250"
                step="0.1"
                placeholder="170"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="weight">体重 (kg)</label>
              <input
                id="weight"
                type="number"
                min="10"
                max="300"
                step="0.1"
                placeholder="65"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                required
              />
            </div>
          </div>
          <button className="btn" type="submit" disabled={analysis.state === "analyzing"}>
            推定する(残り{remaining}回)
          </button>
          {error && <p style={{ color: "#c53030" }}>{error}</p>}
        </form>
        </>
      )}

      {result != null && (
        <div className="card result">
          <p className="note" style={{ marginBottom: 0 }}>入力値ベースの推定</p>
          <div className="value">{result.base}%</div>
          {result.experimental != null && (
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid #edf2f7",
              }}
            >
              <p className="note" style={{ marginBottom: 0 }}>
                写真の体型特徴を加えた実験的推定
              </p>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#38a169" }}>
                {result.experimental}%
              </div>
            </div>
          )}
          <p className="note" style={{ marginTop: 8 }}>
            β版の推定値です。実験的な補正であり、体組成計などの実測値とは差が出ます。
          </p>
          <button className="btn" type="button" onClick={saveResult}>
            この結果を記録する
          </button>
        </div>
      )}
    </>
  );
}
