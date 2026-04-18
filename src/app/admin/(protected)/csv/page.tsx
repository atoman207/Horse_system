import CsvTools from "./CsvTools";

export default function CsvPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">CSV 入出力</h1>
      <div className="card">
        <h2 className="section-title">顧客データ</h2>
        <p className="text-sm text-ink-soft mb-3">
          会員情報の一括出力／取込ができます。エクスポートした CSV の列名は、そのままインポート時のキーになります。
        </p>
        <CsvTools />
      </div>
      <div className="card text-sm">
        <h2 className="section-title">CSV 列定義</h2>
        <ul className="list-disc list-inside space-y-1">
          <li><code>full_name</code>：氏名（必須）</li>
          <li><code>full_name_kana</code>：カナ</li>
          <li><code>email</code>：メール</li>
          <li><code>phone</code>：電話</li>
          <li><code>postal_code</code>、<code>address1</code>、<code>address2</code>：住所</li>
          <li><code>birthday</code>：YYYY-MM-DD</li>
          <li><code>gender</code>：male / female / other / unspecified</li>
          <li><code>status</code>：active / suspended / withdrawn</li>
          <li><code>stripe_customer_id</code>：既存の Stripe 顧客 ID</li>
        </ul>
      </div>
    </div>
  );
}
