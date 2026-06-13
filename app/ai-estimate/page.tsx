"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { estimateBodyFat, type Sex } from "@/lib/bodyfat";
import { BODYFAT_KEY, type BodyFatRecord } from "@/lib/records";
import {
  AI_CONSENT_KEY,
  AI_FREE_LIMIT,
  AI_USAGE_KEY,
  canUseFree,
  remainingUses,
} from "@/lib/usage";
import { loadList, loadValue, saveList, saveValue } from "@/lib/storage";

export default function AiEstimatePage() {
  const [loaded, setLoaded] = useState(false);
  const [consented, setConsented] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [used, setUsed] = useState(0);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState("");
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
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function estimate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!canUseFree(used)) return;
    if (!photoUrl) {
      setError("写真を選択してください");
      return;
    }
    try {
      const percent = estimateBodyFat({
        sex,
        age: Number(age),
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
      });
      setResult(percent);
      const next = used + 1;
      setUsed(next);
      saveValue(AI_USAGE_KEY, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "推定できませんでした");
    }
  }

  function saveResult() {
    if (result == null) return;
    const history = loadList<BodyFatRecord>(BODYFAT_KEY);
    const record: BodyFatRecord = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleDateString("sv-SE"),
      percent: result,
      weightKg: Number(weightKg),
    };
    saveList(BODYFAT_KEY, [record, ...history]);
    setResult(null);
    setPhotoUrl(null);
    if (fileRef.current) fileRef.current.value = "";
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
              現時点のβ版は写真そのものからの自動判定はまだ行っておらず、
              入力した数値(年齢・身長・体重)に基づく推定です。写真は確認用に表示するだけです。
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

  // --- 回数を使い切った状態 ---
  const exhausted = remaining === 0;

  return (
    <>
      <h1>AI画像推定(β版)</h1>

      <div className="card" style={{ background: "#fffaf0", borderLeft: "4px solid #dd6b20" }}>
        <p style={{ margin: 0, fontSize: 14 }}>
          📷 <strong>β版のお知らせ</strong>
          <br />
          現在は写真からの自動判定ではなく、入力値に基づく推定です。今後のスプリントで
          画像解析の精度を高めていきます。
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
        <form className="card" onSubmit={estimate}>
          <div className="field">
            <label htmlFor="photo">写真を選択</label>
            <input
              id="photo"
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
            />
          </div>
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="プレビュー"
              style={{ width: "100%", borderRadius: 8, marginBottom: 12 }}
            />
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
          <button className="btn" type="submit">
            推定する(残り{remaining}回)
          </button>
          {error && <p style={{ color: "#c53030" }}>{error}</p>}
        </form>
      )}

      {result != null && (
        <div className="card result">
          <div className="value">{result}%</div>
          <p className="note">
            β版の推定値です。入力データに基づく概算であり、実測値とは差が出ることがあります。
          </p>
          <button className="btn" type="button" onClick={saveResult}>
            この結果を記録する
          </button>
        </div>
      )}
    </>
  );
}
