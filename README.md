# 每日股票分析報告 · Daily Stock Report

靜態 GitHub Pages 網站，透過 n8n 每日自動更新 XML 報告資料。

## 目錄結構

```
stock-report/
├── index.html          ← 主模板（永久不變）
├── xml/
│   ├── index.json      ← 可用日期索引（n8n 每日更新）
│   ├── 2026-04-20.xml  ← 每日報告（n8n 每日新增）
│   ├── 2026-04-19.xml
│   └── ...
└── README.md
```

---

## GitHub Pages 設定

1. 建立 GitHub repo（建議命名：`stock-report`）
2. 將本資料夾所有檔案推送至 `main` branch
3. 前往 **Settings → Pages**，Source 選 **Deploy from a branch** → `main` / `root`
4. 網址為：`https://<your-username>.github.io/stock-report/`

---

## XML 格式說明

每日新增一個 XML 檔於 `xml/` 資料夾，檔名為 `YYYY-MM-DD.xml`。

### 最小範例（一支股票）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<report date="2026-04-21">

  <stock ticker="NVDA" name="NVIDIA Corporation" sector="半導體 / AI基礎設施" exchange="NASDAQ">
    <decision>BUY</decision>        <!-- BUY / HOLD / SELL -->
    <price>205.40</price>
    <week52_low>95.04</week52_low>
    <week52_high>212.19</week52_high>

    <metrics>
      <metric key="單季營收"    value="$681B"  sub="同比 +73%"/>
      <metric key="Forward P/E" value="17.94"  sub="PEG 0.72"/>
      <!-- 建議 4–6 個 metric -->
    </metrics>

    <!-- 5 個固定 section，id 不可改 -->
    <section id="fundamental" title="基本面分析" icon="基"
             color_bg="#EAF3DE" color_text="#3B6D11" open="true">
      <kv key="TTM P/E" val="41.16"/>
      <prose>內文段落一</prose>
      <prose>內文段落二</prose>
    </section>

    <section id="technical" title="技術面分析" icon="技"
             color_bg="#E6F1FB" color_text="#185FA5" open="true">
      <kv key="趨勢" val="上漲"/>
      <prose>技術面說明</prose>
    </section>

    <section id="sentiment" title="市場情緒" icon="情"
             color_bg="#EEEDFE" color_text="#3C3489" open="false">
      <prose>情緒說明</prose>
      <tag>標籤一</tag>
      <tag>標籤二</tag>
    </section>

    <section id="risk" title="風險因素" icon="險"
             color_bg="#FCEBEB" color_text="#A32D2D" open="false">
      <risk>風險描述一</risk>
      <risk>風險描述二</risk>
    </section>

    <section id="verdict" title="最終評級與操作建議" icon="結"
             color_bg="#EAF3DE" color_text="#27500A" open="true" full="true">
      <verdict_card label="評級"   value="買入 BUY" value_color="#3B6D11"/>
      <verdict_card label="目標價" value="$220"/>
      <verdict_card label="止損"   value="$185"/>
      <strategy>策略說明一</strategy>
      <strategy>策略說明二</strategy>
    </section>
  </stock>

  <!-- 可繼續新增更多 <stock> 節點，最多 10 支 -->

</report>
```

### Decision 徽章顏色對照

| 值     | 顯示文字       | 顏色         |
|--------|--------------|--------------|
| `BUY`  | 買入 BUY      | 綠色          |
| `HOLD` | 持有 HOLD     | 橙色          |
| `SELL` | 賣出 SELL     | 紅色          |

---

## n8n Workflow 設定

### 目標
每日自動執行：
1. 產生當日 `YYYY-MM-DD.xml`
2. 更新 `xml/index.json`（加入新日期）
3. 透過 GitHub API 推送兩個檔案

### Workflow 節點配置

#### Node 1：Schedule Trigger
- Trigger: `Cron`
- Expression: `0 18 * * 1-5`（週一至五 18:00，台灣時間需調 UTC offset）

#### Node 2：產生 XML 內容
- Type: `Code`
- 輸入：來自分析 AI Agent 的結果
- 輸出：XML 字串

```javascript
// 範例：組裝 XML
const date = new Date().toISOString().split('T')[0]; // "2026-04-21"
const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<report date="${date}">
  <stock ticker="NVDA" ...>
    ...
  </stock>
</report>`;

return [{ json: { date, xmlContent } }];
```

#### Node 3：取得現有 index.json（GitHub GET）
- Type: `HTTP Request`
- Method: `GET`
- URL: `https://api.github.com/repos/{owner}/{repo}/contents/xml/index.json`
- Header: `Authorization: Bearer {YOUR_GITHUB_TOKEN}`

#### Node 4：更新 index.json（Code）
```javascript
const existing = JSON.parse(Buffer.from($input.item.json.content, 'base64').toString());
const date = $('Node 2').item.json.date;

if (!existing.dates.includes(date)) {
  existing.dates.unshift(date); // 最新日期排最前
}

// 只保留最近 90 天
existing.dates = existing.dates.slice(0, 90);

return [{
  json: {
    sha: $input.item.json.sha,
    newContent: JSON.stringify(existing, null, 2)
  }
}];
```

#### Node 5：上傳 XML 至 GitHub（HTTP Request）
- Method: `PUT`
- URL: `https://api.github.com/repos/{owner}/{repo}/contents/xml/{{ $('Node 2').item.json.date }}.xml`
- Body (JSON):
```json
{
  "message": "Add report {{ $('Node 2').item.json.date }}",
  "content": "{{ Buffer.from($('Node 2').item.json.xmlContent).toString('base64') }}"
}
```

#### Node 6：更新 index.json 至 GitHub（HTTP Request）
- Method: `PUT`
- URL: `https://api.github.com/repos/{owner}/{repo}/contents/xml/index.json`
- Body (JSON):
```json
{
  "message": "Update index {{ $('Node 2').item.json.date }}",
  "content": "{{ Buffer.from($('Node 4').item.json.newContent).toString('base64') }}",
  "sha": "{{ $('Node 4').item.json.sha }}"
}
```

### GitHub Token 權限
- 需要 `contents: write` 權限
- 建議使用 Fine-grained Personal Access Token，限制至單一 repo

---

## 本地測試

GitHub Pages 不支援本地 `file://` 的 fetch，需用本地伺服器：

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

瀏覽 `http://localhost:8080`

---

## 自訂設定

### 修改 XML 資料夾路徑
`index.html` 第一行 `<script>` 中：
```javascript
const XML_DIR = './xml/';  // 改成你的路徑
```

### 新增 Section 類型
目前支援五種固定 id（`fundamental` / `technical` / `sentiment` / `risk` / `verdict`）。
如需新增自訂 section，在 XML 使用任意 id，模板會自動以 kv + prose + tag 格式渲染。
