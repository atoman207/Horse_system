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
        <CsvTools
          exportHref="/api/admin/csv/customers"
          importHref="/api/admin/csv/customers"
          exportLabel="顧客CSVをエクスポート"
          importLabel="顧客CSVを取込む"
          downloadName="customers.csv"
          supportsImport
        />
      </div>

      <div className="card">
        <h2 className="section-title">支援サブスクリプション</h2>
        <p className="text-sm text-ink-soft mb-3">
          顧客×馬の支援レコードを一括出力／取込できます。<code>support_id</code>
          がある行は更新、無い場合は
          <code>customer_email</code> と <code>horse_name</code>（または ID）で紐付けます。
        </p>
        <CsvTools
          exportHref="/api/admin/csv/supports"
          importHref="/api/admin/csv/supports"
          exportLabel="支援CSVをエクスポート"
          importLabel="支援CSVを取込む"
          downloadName="supports.csv"
          supportsImport
        />
      </div>

      <div className="card">
        <h2 className="section-title">寄付履歴</h2>
        <p className="text-sm text-ink-soft mb-3">
          単発寄付の履歴をエクスポートできます（取込は行いません）。
        </p>
        <CsvTools
          exportHref="/api/admin/csv/donations"
          exportLabel="寄付CSVをエクスポート"
          downloadName="donations.csv"
        />
      </div>

      <div className="card text-sm">
        <h2 className="section-title">CSV 列定義</h2>
        <p className="font-bold mt-2">顧客 customers.csv</p>
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
        <p className="font-bold mt-3">支援 supports.csv</p>
        <ul className="list-disc list-inside space-y-1">
          <li><code>support_id</code>（任意）：指定時はそのレコードを更新</li>
          <li><code>customer_email</code> または <code>customer_id</code>（必須）</li>
          <li><code>horse_name</code> または <code>horse_id</code>（必須）</li>
          <li><code>units</code>：口数（例: 0.5、1、2、3.5）</li>
          <li><code>monthly_amount</code>：月額（省略時は <code>units × 12,000</code>）</li>
          <li><code>status</code>：active / canceled / paused / past_due</li>
        </ul>
        <p className="font-bold mt-3">寄付 donations.csv</p>
        <ul className="list-disc list-inside space-y-1">
          <li><code>amount</code>：円単位</li>
          <li><code>customer_email</code>：該当会員の場合に紐付け</li>
          <li><code>donor_name</code>、<code>donor_email</code>：匿名寄付用</li>
          <li><code>status</code>：succeeded / pending / failed / refunded</li>
        </ul>
      </div>
    </div>
  );
}
