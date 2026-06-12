"use client";

import { useEffect, useState } from "react";
import { loadList, saveList } from "@/lib/storage";

interface TrainingRecord {
  id: string;
  date: string;
  exercise: string;
  weightKg: number | null;
  reps: number | null;
  sets: number | null;
  minutes: number | null;
}

const STORAGE_KEY = "training-records";

function today(): string {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
}

export default function TrainingPage() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(today());
  const [exercise, setExercise] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");
  const [minutes, setMinutes] = useState("");

  useEffect(() => {
    setRecords(loadList<TrainingRecord>(STORAGE_KEY));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveList(STORAGE_KEY, records);
  }, [records, loaded]);

  function addRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!exercise.trim()) return;
    const record: TrainingRecord = {
      id: crypto.randomUUID(),
      date,
      exercise: exercise.trim(),
      weightKg: weightKg ? Number(weightKg) : null,
      reps: reps ? Number(reps) : null,
      sets: sets ? Number(sets) : null,
      minutes: minutes ? Number(minutes) : null,
    };
    setRecords([record, ...records]);
    setExercise("");
    setWeightKg("");
    setReps("");
    setSets("");
    setMinutes("");
  }

  function removeRecord(id: string) {
    setRecords(records.filter((r) => r.id !== id));
  }

  return (
    <>
      <h1>トレーニング記録</h1>

      <form className="card" onSubmit={addRecord}>
        <div className="field">
          <label htmlFor="date">日付</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="exercise">種目</label>
          <input
            id="exercise"
            type="text"
            placeholder="例: ベンチプレス"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            required
          />
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="weight">重量 (kg)</label>
            <input
              id="weight"
              type="number"
              min="0"
              step="0.5"
              placeholder="60"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="reps">回数</label>
            <input
              id="reps"
              type="number"
              min="1"
              placeholder="10"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="sets">セット数</label>
            <input
              id="sets"
              type="number"
              min="1"
              placeholder="3"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="minutes">時間 (分)</label>
            <input
              id="minutes"
              type="number"
              min="1"
              placeholder="30"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
        </div>
        <button className="btn" type="submit">
          記録する
        </button>
      </form>

      <h2>履歴({records.length}件)</h2>
      <div className="card">
        {records.length === 0 ? (
          <p className="empty">まだ記録がありません</p>
        ) : (
          records.map((r) => (
            <div className="record" key={r.id}>
              <div>
                <div>{r.exercise}</div>
                <div className="meta">
                  {r.date}
                  {r.weightKg != null && ` ・ ${r.weightKg}kg`}
                  {r.reps != null && ` × ${r.reps}回`}
                  {r.sets != null && ` × ${r.sets}セット`}
                  {r.minutes != null && ` ・ ${r.minutes}分`}
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
