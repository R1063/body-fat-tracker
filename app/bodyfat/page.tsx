"use client";

import { useEffect, useState } from "react";
import { estimateBodyFat, type Sex } from "@/lib/bodyfat";
import { loadList, saveList } from "@/lib/storage";

interface BodyFatRecord {
  id: string;
  date: string;
  percent: number;
  weightKg: number;
}

const STORAGE_KEY = "bodyfat-records";

export default function BodyFatPage() {
  const [history, setHistory] = useState<BodyFatRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setHistory(loadList<BodyFatRecord>(STORAGE_KEY));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveList(STORAGE_KEY, history);
  }, [history, loaded]);

  function calculate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    try {
      const percent = estimateBodyFat({
        sex,
        age: Number(age),
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
      });
      setResult(percent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "計算できませんでした");
    }
  }

  function saveResult() {
    if (result == null) return;
    const record: BodyFatRecord = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleDateString("sv-SE"),
      percent: result,
      weightKg: Number(weightKg),
    };
    setHistory([record, ...history]);
    setResult(null);
  }

  function removeRecord(id: string) {
    setHistory(history.filter((r) => r.id !== id));
  }

  return (
    <>
      <h1>体脂肪率の推定</h1>

      <form className="card" onSubmit={calculate}>
        <div className="row">
          <div className="field">
            <label htmlFor="sex">性別</label>
            <select
              id="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex)}
            >
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
          推定する
        </button>
        {error && <p style={{ color: "#c53030" }}>{error}</p>}
      </form>

      {result != null && (
        <div className="card result">
          <div className="value">{result}%</div>
          <p className="note">
            BMI と年齢に基づく統計的な推定値です。体組成計などの実測値とは差が出ることがあります。
          </p>
          <button className="btn" type="button" onClick={saveResult}>
            この結果を記録する
          </button>
        </div>
      )}

      <h2>記録({history.length}件)</h2>
      <div className="card">
        {history.length === 0 ? (
          <p className="empty">まだ記録がありません</p>
        ) : (
          history.map((r) => (
            <div className="record" key={r.id}>
              <div>
                <div>体脂肪率 {r.percent}%</div>
                <div className="meta">
                  {r.date} ・ 体重 {r.weightKg}kg
                </div>
              </div>
              <button
                className="btn btn-small"
                type="button"
                onClick={() => removeRecord(r.id)}
              >
                削除
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
