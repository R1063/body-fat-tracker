"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BODYFAT_KEY, GOAL_KEY, type BodyFatRecord } from "@/lib/records";
import {
  filterByRange,
  goalProgress,
  RANGE_LABELS,
  type Range,
} from "@/lib/progress";
import { loadList, loadValue, saveValue } from "@/lib/storage";

interface ChartPoint {
  date: string;
  value: number;
}

function Chart({
  title,
  unit,
  points,
  goal,
}: {
  title: string;
  unit: string;
  points: ChartPoint[];
  goal?: number | null;
}) {
  const W = 320;
  const H = 150;
  const PAD = { left: 36, right: 12, top: 10, bottom: 22 };

  if (points.length === 0) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p className="empty">この期間の記録はありません</p>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  if (goal != null) values.push(goal);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const margin = (max - min) * 0.1;
  min -= margin;
  max += margin;

  const times = points.map((p) => new Date(`${p.date}T00:00:00`).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const x = (t: number) =>
    tMax === tMin ? PAD.left + plotW / 2 : PAD.left + ((t - tMin) / (tMax - tMin)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH;

  const coords = points.map((p, i) => ({
    cx: x(times[i]),
    cy: y(p.value),
  }));
  const path = coords.map((c) => `${c.cx},${c.cy}`).join(" ");
  const shortDate = (d: string) => d.slice(5).replace("-", "/");

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} style={{ width: "100%" }}>
        {/* Y軸の目盛り(上限・下限) */}
        <text x={PAD.left - 4} y={y(max) + 4} textAnchor="end" fontSize="10" fill="#718096">
          {(Math.round(max * 10) / 10).toFixed(1)}
        </text>
        <text x={PAD.left - 4} y={y(min) + 4} textAnchor="end" fontSize="10" fill="#718096">
          {(Math.round(min * 10) / 10).toFixed(1)}
        </text>
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#e2e8f0" />
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#e2e8f0" />

        {goal != null && goal >= min && goal <= max && (
          <>
            <line
              x1={PAD.left}
              y1={y(goal)}
              x2={W - PAD.right}
              y2={y(goal)}
              stroke="#e53e3e"
              strokeDasharray="4 4"
            />
            <text x={W - PAD.right} y={y(goal) - 4} textAnchor="end" fontSize="10" fill="#e53e3e">
              目標 {goal}
              {unit}
            </text>
          </>
        )}

        {points.length > 1 && (
          <polyline points={path} fill="none" stroke="#2b6cb0" strokeWidth="2" />
        )}
        {coords.map((c, i) => (
          <circle key={points[i].date + i} cx={c.cx} cy={c.cy} r="3" fill="#2b6cb0" />
        ))}

        <text x={PAD.left} y={H - 6} fontSize="10" fill="#718096">
          {shortDate(points[0].date)}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="10" fill="#718096">
          {shortDate(points[points.length - 1].date)}
        </text>
      </svg>
      <p className="note">
        最新: {points[points.length - 1].value}
        {unit}
      </p>
    </div>
  );
}

export default function ProgressPage() {
  const [records, setRecords] = useState<BodyFatRecord[]>([]);
  const [range, setRange] = useState<Range>("month");
  const [goal, setGoal] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState("");

  useEffect(() => {
    setRecords(loadList<BodyFatRecord>(BODYFAT_KEY));
    const saved = loadValue<number>(GOAL_KEY);
    if (saved != null) {
      setGoal(saved);
      setGoalInput(String(saved));
    }
  }, []);

  function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(goalInput);
    if (!goalInput || Number.isNaN(value) || value <= 0 || value >= 75) return;
    setGoal(value);
    saveValue(GOAL_KEY, value);
  }

  const filtered = filterByRange(records, range);
  const bodyFatPoints = filtered.map((r) => ({ date: r.date, value: r.percent }));
  const weightPoints = filtered.map((r) => ({ date: r.date, value: r.weightKg }));

  const sortedAll = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const start = sortedAll[0] ?? null;
  const current = sortedAll[sortedAll.length - 1] ?? null;
  const progress =
    goal != null && start && current
      ? goalProgress(start.percent, current.percent, goal)
      : null;

  return (
    <>
      <h1>推移と目標</h1>

      {records.length === 0 ? (
        <div className="card">
          <p className="empty">
            まだ記録がありません。
            <br />
            <Link href="/bodyfat">体脂肪率のページ</Link>で最初の記録をつけましょう。
          </p>
        </div>
      ) : (
        <>
          <div className="tabs">
            {(Object.keys(RANGE_LABELS) as Range[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`tab${range === key ? " active" : ""}`}
                onClick={() => setRange(key)}
              >
                {RANGE_LABELS[key]}
              </button>
            ))}
          </div>

          <Chart title="体脂肪率 (%)" unit="%" points={bodyFatPoints} goal={goal} />
          <Chart title="体重 (kg)" unit="kg" points={weightPoints} />
        </>
      )}

      <h2>目標体脂肪率</h2>
      <form className="card" onSubmit={saveGoal}>
        <div className="row">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="goal">目標値 (%)</label>
            <input
              id="goal"
              type="number"
              min="1"
              max="74"
              step="0.1"
              placeholder="15"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 0, justifyContent: "flex-end" }}>
            <button className="btn" type="submit">
              目標を設定
            </button>
          </div>
        </div>
        {goal != null && progress != null && start && current && (
          <div style={{ marginTop: 16 }}>
            <div className="progressbar">
              <div className="progressbar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="note">
              開始 {start.percent}% → 現在 {current.percent}% → 目標 {goal}%(達成度{" "}
              {progress}%)
            </p>
          </div>
        )}
      </form>
    </>
  );
}
