import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>体脂肪計測アプリ</h1>
      <p>トレーニングと体の変化を、毎日かんたんに記録しましょう。</p>
      <div className="home-links">
        <Link href="/training">
          <strong>🏋️ トレーニング記録</strong>
          種目・重量・回数・時間を記録して履歴を確認できます
        </Link>
        <Link href="/bodyfat">
          <strong>📊 体脂肪率の推定</strong>
          年齢・身長・体重から体脂肪率を推定して記録できます
        </Link>
        <Link href="/progress">
          <strong>📈 推移と目標</strong>
          体脂肪率・体重のグラフと目標の達成度を確認できます
        </Link>
      </div>
      <p className="note">
        データはこの端末のブラウザ内にのみ保存されます(スプリント1時点)。
      </p>
    </>
  );
}
