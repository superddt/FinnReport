#!/usr/bin/env python3
"""Build TSLA report XML and merge into daily report for 2026-04-24."""
import re
import xml.etree.ElementTree as ET
from xml.dom import minidom
import sys

def esc(text):
    """Escape & < > for XML text content (not quotes)."""
    text = text.replace('\\u2014', '--').replace('\\u2013', '-')
    text = text.replace('\\u2018', "'").replace('\\u2019', "'")
    text = text.replace('\\u201c', '"').replace('\\u201d', '"')
    text = text.replace('\\u2022', 'o').replace('\\xa0', ' ')
    text = text.replace('\\n', ' ').replace('\\r', '')
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def esc_attr(text):
    """Escape & < > and " for XML attribute values."""
    text = text.replace('\\u2014', '--').replace('\\u2013', '-')
    text = text.replace('\\u2018', "'").replace('\\u2019', "'")
    text = text.replace('\\u201c', '"').replace('\\u201d', '"')
    text = text.replace('\\u2022', 'o').replace('\\xa0', ' ')
    text = text.replace('\\n', ' ').replace('\\r', '')
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

# ── Build the TSLA stock element ───────────────────────────
stock = ET.Element('stock', {
    'ticker': 'TSLA',
    'name': 'Tesla, Inc.',
    'sector': 'Consumer Cyclical',
    'exchange': 'NASDAQ',
    'current_price': '$373.72',
    'week52_high': '$498.83',
    'week52_low': '$259.63',
})

# ── Metrics ───────────────────────────
metrics = ET.SubElement(stock, 'metrics')
metrics_data = [
    ('PE', '348.58'),
    ('PEG', '5.67'),
    ('Forward PE', '142.79'),
    ('ROE', '23.40'),
    ('P/B', '17.19'),
    ('Gross Margin', '16.5'),
    ('Operating Margin', '4.2'),
    ('Beta', '1.915'),
    ('RSI', '47.73'),
    ('MACD', '-0.124'),
    ('50 SMA', '388.12'),
    ('200 SMA', '400.45'),
    ('Cash &amp; Equivalents', '447億'),
    ('Forward EPS', '2.64'),
    ('EPS (TTM)', '1.08'),
]
for key, val in metrics_data:
    ET.SubElement(metrics, 'metric', key=key, value=val)

# ── Fundamental section ─────────────────────────────
sec = ET.SubElement(stock, 'section', {
    'name': 'fundamental', 'title': '基本面分析', 'icon': '基',
    'color_bg': '#EAF3DE', 'color_text': '#3B6D11', 'open': 'true'
})

fundamental_kv_raw = [
    ('評級', '持有（HOLD）— 估值風險與資產負債表防護的拉鋸'),
    ('市值', '1,413.9億美元 — 大型股領先者'),
    ('本益比 P/E (TTM)', '348.58x — 嚴重高估警示'),
    ('前向本益比', '142.79x — 仍極度高'),
    ('PEG 比率', '5.67 — 相對於增長高估'),
    ('股價淨值比 P/B', '17.19x — 溢價估值'),
    ('毛利率', '16.5% — 持續壓力'),
    ('營業利益率', '4.2% — 核心效率降低'),
    ('現金及等價物', '447億美元 — 堡壘基礎'),
    ('總負債', '159億美元'),
    ('Beta', '1.915 — 高波動'),
    ('52週區間', '259.63 - 498.83美元'),
]
for k, v in fundamental_kv_raw:
    ET.SubElement(sec, 'kv', key=esc(k), val=esc(v))

fundamental_prose = [
    '特斯拉面臨顯著的估值擔憂，儘管維持強健的資產負債表並產生正現金流。公司在盈利指標方面展現明顯惡化，營收從2025年Q3的281億美元降至2026年Q1的224億美元。股價交易於極端高估的348.58倍TTM本益比和142.79倍前向本益比，遠超汽車製造商的合理水平。',

    '特斯拉的資產負債表仍保持強健，擁有447億美元現金和短期投資，總負債僅159億美元，淨現金頭寸約288億美元。然而，盈利壓力、研發和銷售一般管理費用（SG&A）支出上升，以及庫存累積，暗示短期挑戰。',

    '關鍵基本面指標：本益比348.58倍屬嚴重高估值，前向PE 142.79倍仍極度高，PEG比率5.67表明相對於增長率而言嚴重高估，股價淨值比17.19倍反映溢價估值。毛利率16.5%顯示持續的定價壓力，營業利益率4.2%表明核心業務效率降低。',

    '營收趨勢令人擔憂：Q3 2025營收達到281億美元高峰，至Q1 2026降至223.9億美元，降幅達20%。淨收入從Q4 2025的15.7億美元降至Q1 2026的4.77億美元。EPS (TTM) 僅1.08美元，而Forward EPS 2.64美元預期小幅改善。Beta值1.915顯示高波動性。',
]
for p in fundamental_prose:
    pe = ET.Element('prose')
    pe.text = esc(p)
    sec.append(pe)

fundamental_tags = ['嚴重高估值', '營收衰退', '毛利率萎縮', '庫存累積', '堡壘資產負債表']
for t in fundamental_tags:
    te = ET.Element('tag')
    te.text = esc(t)
    sec.append(te)

# ── Technical section ────────────────────────────────
sec = ET.SubElement(stock, 'section', {
    'name': 'technical', 'title': '技術面分析', 'icon': '技',
    'color_bg': '#E6F1FB', 'color_text': '#185FA5', 'open': 'true'
})

technical_kv_raw = [
    ('評級', '中性偏空 — 中期下跌趨勢，動能穩定'),
    ('50日均線', '388.12美元 — 動態阻力'),
    ('200日均線', '400.45美元 — 長期壓力'),
    ('RSI', '47.73（中性，從超賣復甦中）'),
    ('MACD', '-0.124（早期看漲背離訊號）'),
    ('布林帶中軌', '388美元附近 — 均值回歸基準'),
    ('關鍵轉折區間', '388-400美元 — 必須重新站上才能確認反轉'),
    ('風險/報酬比', '偏空 — 下行空間大於上行空間'),
]
for k, v in technical_kv_raw:
    ET.SubElement(sec, 'kv', key=esc(k), val=esc(v))

technical_prose = [
    '特斯拉（TSLA）經歷了從2026年1月下旬約435美元高點至4月初低點約343美元的急挫，隨後出現部分復甦，在4月15日達到約394.65美元的高點，目前股價回調至373.72美元（4月23日收盤）。該股處於中期下跌趨勢，但早期展現動能穩定訊號。',

    '移動平均線分析：目前50日均線為388.12美元，股價在其下方14.40美元處，中期趨勢偏空。200日均線為400.45美元，股價在其下方26.73美元處，長期趨勢偏空。10日EMA為379.40美元，股價在其下方5.68美元處，空頭壓力持續。三大移動平均線均呈下降趨勢並位於當前價格上方，形成動態阻力天花板。50日均線從3月25日的411.69美元降至4月23日的388.12美元，200日均線從395.57美元降至400.45美元。死亡交叉尚未出現但迫在眉睫。股價必須重新站上388至400美元區間才能發出有意義的反轉訊號。',

    'RSI分析：當前RSI為47.73（4月23日），近期低點為31.75（3月30日，超賣區間）。RSI從3月30日的深度超賣水平穩步回升，至4月17日達到60.31，隨後回调至47.73。RSI已從深度超賣環境中恢復，但仍在中性區間。從60.31回调至47.73表明在brief bounce後有部分獲利了結。',

    'MACD分析：當前MACD為-0.124（4月23日），近期低點為-14.57（4月15日）。MACD與價格之間出現看漲背離——價格創低但MACD不再創低——這是潛在的反轉提前訊號。MACD直方圖正數柱持續擴張，顯示空頭動能衰竭。',
]
for p in technical_prose:
    pe = ET.Element('prose')
    pe.text = esc(p)
    sec.append(pe)

technical_tags = ['死亡交叉威脅', 'MACD看漲背離', 'RSI中性', '移動平均空頭排列', '動能衰竭']
for t in technical_tags:
    te = ET.Element('tag')
    te.text = esc(t)
    sec.append(te)

# ── Sentiment section ────────────────────────────────
sec = ET.SubElement(stock, 'section', {
    'name': 'sentiment', 'title': '市場情緒', 'icon': '情',
    'color_bg': '#EEEDFE', 'color_text': '#3C3489', 'open': 'true'
})

sentiment_kv_raw = [
    ('情緒總覽', '混亂/分歧 — 基本面強但估值壓力大'),
    ('Q1收益表現', '營收223.9億美元 超出預期'),
    ('淨收入', '4.77億美元 超出利潤預期'),
    ('Cybercab進度', '生產已啟動 — Giga Texas'),
    ('250億美元資本支出', '激進AI/機器人轉型'),
    ('生產交付差距', '約50,363輛 — 需求放緩訊號'),
    ('庫存水平', '144億美元 — 持續累積'),
    ('監管信用收入', '加速下滑 — 利潤緩衝消失'),
    ('DZ銀行評級', '買進 — 目標價543美元'),
]
for k, v in sentiment_kv_raw:
    ET.SubElement(sec, 'kv', key=esc(k), val=esc(v))

sentiment_prose = [
    '特斯拉為投資者帶來混亂的一週，呈現基本面績效與市場情緒之間明顯分歧。公司公告Q1 FY2026收益超出利潤預期，確認Cybercab自動駕駛計程車生產啟動，並披露與英特爾在AI晶片製造的戰略合作。然而，股價下跌，因為投資者對前所未有的250億美元以上資本支出指引、生產與交付差距擴大，以及監管信用收入快速下滑（一項關鍵利潤來源）做出負面反應。',

    '定義特斯拉當前狀態的核心理念張力：特斯拉正成功從純電動車製造商轉型為AI/機器人集團，但市場要求公司目前無法提供的近期視圖。',

    'Q1 FY2026收益亮點：營收223.9億美元（超出估計），淨收入4.77億美元（超出利潤預期），生產408,386輛，交付358,023輛。儘管收益預期，股價在週四早晨財報後下跌，表明市場反應更多由前瞻指引驅動。這是一項關鍵訊號——特斯拉的估值已與傳統電動車指標脫鉤，完全取決於AI/機器人執行時間表。',

    '250億美元資本支出困境：本週最空頭催化劑是特斯拉確認2026年超過250億美元資本支出，標誌著向AI計算基礎設施、自動駕駛車隊擴展、人形機器人（Optimus）開發、以及透過英特爾Terafab合作的晶片製造的決定性、激進轉型。',

    '市場情緒指標：DZ銀行給予買進評級（目標價543美元，自2026年1月起）。然而，大多數分析師維持持有評級，反映對當前估值和水位的謹慎。社交媒體情緒偏向悲觀，關注估值擴張、庫存積壓和對AI轉型的懷疑。',
]
for p in sentiment_prose:
    pe = ET.Element('prose')
    pe.text = esc(p)
    sec.append(pe)

sentiment_tags = ['AI轉型', 'Cybercab生產', '250億美元資本支出', '庫存壓力', '監管信用衰退', 'DZ銀行買進']
for t in sentiment_tags:
    te = ET.Element('tag')
    te.text = esc(t)
    sec.append(te)

# ── Risk section ─────────────────────────────────────
sec = ET.SubElement(stock, 'section', {
    'name': 'risk', 'title': '風險因素', 'icon': '險',
    'color_bg': '#FCEBEB', 'color_text': '#A32D2D', 'open': 'true'
})

risk_kv_raw = [
    ('風險總等級', '高 — 估值+基本面+執行的三重風險'),
    ('估值崩潰風險', '348x P/E收斂至25-30x = 股價下跌60-70%'),
    ('營收衰退', '20%下降趨勢加速中'),
    ('庫存風險', '144億美元累積 + 50K交付缺口'),
    ('監管信用收入崩落', 'SEC確認快速下滑'),
    ('資本支出風險', '250億美元激進支出，執行風險高'),
]
for k, v in risk_kv_raw:
    ET.SubElement(sec, 'kv', key=esc(k), val=esc(v))

risk_prose = [
    '估值崩潰風險：348倍本益比和5.67倍PEG比率表明股票定價追求完美增長，但數據明確矛盾。若本益比收斂至汽車製造商的合理25-30倍，股價可能下跌60-70%。',

    '營收衰退加速：三年內營收減少20%且趨勢仍在加速。營收從Q3 2025高峰281億美元下降至Q1 2026的223.9億美元。若營收持續衰退，現金流生成能力將受到嚴重威脅。',

    '庫存和交付差距擴大：生產交付差距約50,363輛，最大業務板塊估計萎縮40%。庫存累積達144億美元，在競爭性電動車環境中，滯銷庫存必然迫使進一步的利潤壓縮和定價壓力。',

    '監管信用收入崩落：SEC文件確認此項收入將快速下降。這曾是純粹的利潤緩衝，如今正消失。毛利率16.5%反映持續的定價壓力，營業利益從Q4的15.7億美元降至Q1的4.77億美元。',

    '250億美元資本支出執行風險：在核心業務萎縮的同時追加250億美元資本支出是極高風險的博弈。若AI/機器人轉型進展不順，將嚴重稀釋股權並破壞現金流。',

    '分析師分歧：DZ銀行給予買進評級（目標價543美元），但大多數分析師維持中立，反映市場對電動車龍頭轉型期估值的謹慎態度和高度分化預期。',
]
for p in risk_prose:
    re2 = ET.Element('risk')
    re2.text = esc(p)
    sec.append(re2)

risk_tags = ['估值崩潰', '營收衰退', '庫存壓力', '監管信用消失', '資本支出風險']
for t in risk_tags:
    te = ET.Element('tag')
    te.text = esc(t)
    sec.append(te)

# ── Verdict section ────────────────────────────────
sec = ET.SubElement(stock, 'section', {
    'name': 'verdict', 'title': '最終評級與操作建議', 'icon': '結',
    'color_bg': '#EAF3DE', 'color_text': '#27500A', 'open': 'true'
})

verdict_cards = [
    ('最終評級', '賣出（Sell）', '#A32D2D'),
    ('建議目標價', '下檔目標 $320（破 $340）', '#A32D2D'),
    ('防守價位', '$360 以下（ consolidation base breakdown）', '#A32D2D'),
    ('建議交易方向', '全數賣出', '#A32D2D'),
    ('部位調整', '100% 減持 — 不允許攤平', '#A32D2D'),
    ('進場區間', '不建議建倉 — 等待基本面穩定', '#185FA5'),
    ('時間週期', '戰術性（日內至短期波段）', '#27500A'),
]
for label, val, color in verdict_cards:
    ET.SubElement(sec, 'verdict_card', label=esc(label), value=esc(val), value_color=esc(color))

# Strategy
strategy_lines = [
    '進場策略：執行全面的市場賣出，清倉所有現有多頭部位。在基本面和技術面穩定之前，不允許攤平或分批建倉。部位規模：減少100%當前TSLA曝險。不允許新的多頭進場。若符合法規，分配少量資本購買TSLA價外看跌期權以限制尾部風險，但主要指令仍是全面退出。',
    '關鍵風險水平：每日收盤低於340美元（目標320美元）確認看漲加速觸發。看漲反轉觸發需要日均量以上收盤突破390美元。若TSLA跌破360美元， consolidation base失效。時間週期：戰術性（日內至短期波段），部位將撤出帳簿，直到TSLA展現穩定的自由現金流並在自身基礎上突破388-400美元阻力區間。',
]
for s in strategy_lines:
    se = ET.Element('strategy')
    se.text = esc(s)
    sec.append(se)

verdict_prose = [
    '多空激烈辯論的綜合結論：多方論點依賴超過348倍本益比、堡壘資產負債表和長期AI/自動駕駛車期權，認為當前回調是代代累積區間。空方聚焦惡化的財務現實：三年營收減少20%、壓縮的營業利潤率、監管信用逆風消失，以及激進的股權稀釋。',

    '技術面上，空方強調TSLA在關鍵移動平均線的拒絕、負動能和擴大的生產交付差距，風險報酬結構嚴重偏向下行。多空雙方均承認現金儲備和季度營業現金流提供關鍵流動性基礎，但無法支撐348倍本益比或抵銷即時的結構性逆風。',

    '空方論據更具說服力因為它們著眼於已確認的價格行動和近期的基本面衰退，而多方論證依賴多年的執行時間表和無法抵銷即時盈利惡化的投機性期權。當一檔股票在業績超預期的情況下仍下跌時，顯示前瞻性指引和利潤率預期已負面轉變，這是強烈的轉彎訊號。',
]
for p in verdict_prose:
    pe = ET.Element('prose')
    pe.text = esc(p)
    sec.append(pe)

# ── Write TSLA stock to temp XML for validation ───────────────
tsla_xml = ET.tostring(stock, encoding='unicode', method='xml')
print(f'TSLA source XML length: {len(tsla_xml)} bytes')

# ── Validate standalone TSLA stock ─────────────────────────────
try:
    ET.fromstring(tsla_xml)
    print('Step 1: TSLA stock XML validation PASSED')
except ET.ParseError as e:
    print(f'Step 1: TSLA stock XML validation FAILED: {e}')
    sys.exit(1)

# ── Merge into existing daily XML ──────────────────────────────
existing_path = '/opt/data/finnreport/xml/2026-04-24.xml'
existing = open(existing_path).read()
existing_tree = ET.fromstring(existing)

# Check if TSLA already exists
existing_stocks = [s for s in existing_tree if s.tag == 'stock']
ticker_list = [s.get('ticker') for s in existing_stocks]
print(f'Existing stocks in XML: {ticker_list}')

if 'TSLA' in ticker_list:
    print('TSLA already exists in XML, replacing...')
    for i, s in enumerate(existing_tree):
        if s.tag == 'stock' and s.get('ticker') == 'TSLA':
            existing_tree.remove(s)
            existing_tree.insert(i, stock)
            break
else:
    # Insert after NVDA
    for i, s in enumerate(existing_tree):
        if s.tag == 'stock' and s.get('ticker') == 'NVDA':
            existing_tree.insert(i + 1, stock)
            print('TSLA inserted after NVDA')
            break

# ── Validate merged XML ──────────────────────────────────────
merged = ET.tostring(existing_tree, encoding='unicode', method='xml')
try:
    ET.fromstring(merged)
    print('Step 2: Merged XML validation PASSED')
except ET.ParseError as e:
    print(f'Step 2: Merged XML validation FAILED: {e}')
    sys.exit(1)

# ── Pretty print and write ───────────────────────────────────
rough = ET.tostring(existing_tree, encoding='unicode', method='xml')
reparsed = minidom.parseString(rough)
formatted = reparsed.toprettyxml(indent='  ', encoding=None)

# Clean up extra blank lines
lines = formatted.split('\n')
clean = []
for line in lines:
    stripped = line.strip()
    if stripped == '':
        if clean and clean[-1].strip() != '':
            clean.append('')
    else:
        clean.append(line)
while clean and clean[-1].strip() == '':
    clean.pop()
output = '\n'.join(clean).strip() + '\n'

with open(existing_path, 'w', encoding='utf-8') as f:
    f.write(output)

# ── Final validation of written file ─────────────────────────
final_check = open(existing_path).read()
try:
    ET.fromstring(final_check)
    print('Step 3: Final file XML validation PASSED')
except ET.ParseError as e:
    print(f'Step 3: Final file XML validation FAILED: {e}')
    sys.exit(1)

# Count stocks
tickers = re.findall(r'ticker="([^"]+)"', final_check)
print(f'Steps complete. Stocks in XML: {tickers}')
print(f'TSLA current_price: $373.72 | 52w High: $498.83 | 52w Low: $259.63')
print(f'TSLA Rating: Sell | P/E: 348.58x | Forward PE: 142.79x | PEG: 5.67')
print('XML merge complete! Ready for git deployment.')
