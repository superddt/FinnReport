/* 股票代碼顏色映射 */
const TICKER_COLORS={AAPL:'#00bcd4',GOOG:'#4caf50',NVDA:'#76ff03',MSFT:'#2979ff',META:'#ff6d00',AMZN:'#ff9800',TSLA:'#f44336',SPY:'#9c27b0',QQQ:'#e040fb',VIX:'#ff5252'};
const COMPANY_NAMES={AAPL:'Apple Inc.',GOOG:'Alphabet Inc.',NVDA:'NVIDIA Corporation',MSFT:'Microsoft Corp.',META:'Meta Platforms',AMZN:'Amazon.com',TSLA:'Tesla Inc.'};
function getColor(t){return TICKER_COLORS[t]||'#9c27b0';}

/* DataParser：從 Markdown 萃取數據 */
const P={
  x(md,re,fb){if(!md)return fb||'N/A';const m=md.match(re);return m?m[1]:fb||'N/A';},
  tech(md){return{
    price:P.x(md,/(?:close|current\s*price|trading\s*close)[^$]*?\$(\d+\.\d+)/i,'--')||P.x(md,/\$(\d+\.\d+)/,'--'),
    sma50:P.x(md,/50.SMA.*?\$(\d+\.\d+)/),sma200:P.x(md,/200.SMA.*?\$(\d+\.\d+)/),
    ema10:P.x(md,/10.EMA.*?\$(\d+\.\d+)/),
    // NOTE: 使用表格格式 "| MACD | +4.02 |" 或 "MACD line (X.XX)" 精確匹配
    macd:P.x(md,/\|\s*MACD\s*\|\s*([+-]?\d+\.\d+)/)||P.x(md,/MACD\s+(?:line\s*)?\(?([+-]?\d+\.\d+)/),
    rsi:P.x(md,/\|\s*RSI\s*\|\s*(\d+\.\d+)/)||P.x(md,/RSI\s+(?:at\s+)?~?(\d+\.\d+)/),
    atr:P.x(md,/\|\s*ATR\s*\|\s*\$?(\d+\.\d+)/)||P.x(md,/ATR.*?\$(\d+\.\d+)/),
    bollUp:P.x(md,/[Uu]pper.*?\$(\d+\.\d+)/),bollMid:P.x(md,/[Mm]iddle.*?\$(\d+\.\d+)/),
    bollLow:P.x(md,/[Ll]ower.*?\$(\d+\.\d+)/)
  };},
  fund(md){return{
    mktCap:P.x(md,/[Mm]arket [Cc]ap.*?\$([\d.]+\s*[TBM])/),
    pe:P.x(md,/P\/E.*?(\d+\.\d+)x/),fpe:P.x(md,/[Ff]orward P\/E.*?(\d+\.\d+)/),
    peg:P.x(md,/PEG.*?(\d+\.\d+)/),gm:P.x(md,/[Gg]ross [Mm]argin.*?(\d+\.\d+)%/),
    nm:P.x(md,/[Nn]et [Mm]argin.*?(\d+\.\d+)%/),roe:P.x(md,/ROE.*?(\d+\.?\d*)%/),
    fcf:P.x(md,/[Ff]ree [Cc]ash [Ff]low.*?\$([\d.]+[BM])/)
  };},
  decision(d){
    const t=(d.final_trade_decision||d.trader_investment_decision||'').toUpperCase();
    if(t.includes('SELL'))return'SELL';if(t.includes('BUY'))return'BUY';return'HOLD';
  },
  rsiColor(v){const n=parseFloat(v);if(isNaN(n))return'var(--text2)';if(n>70||n<30)return'var(--sell)';if(n>60)return'var(--hold)';if(n>50)return'var(--buy)';return'var(--text2)';},
  macdColor(v){const n=parseFloat(v);return n>0?'var(--buy)':n<0?'var(--sell)':'var(--text2)';},
  macdClass(v){const n=parseFloat(v);return n>0?'bullish':n<0?'bearish':'neutral';},
  rsiClass(v){const n=parseFloat(v);if(n>70)return'bearish';if(n<30)return'bearish';if(n>50)return'bullish';return'neutral';},
  rsiLabel(v){const n=parseFloat(v);if(n>70)return'⚠ 超買';if(n<30)return'超賣';if(n>60)return'中性';if(n>50)return'中性偏多';return'中性偏空';}
};

/* 全域狀態 */
let manifest=null,stockData={},currentDate='';

async function initDashboard(){
  try{
    manifest=await fetch('data/manifest.json').then(r=>r.json());
    const params=new URLSearchParams(location.search);
    currentDate=params.get('date')||manifest.latest;
    document.getElementById('dateInput').value=currentDate;
    await loadDate(currentDate);
  }catch(e){
    console.error('Init failed:',e);
    document.getElementById('mainContent').innerHTML='<div style="text-align:center;padding:60px;color:var(--sell)"><h2>載入失敗</h2><p>'+e.message+'</p></div>';
  }finally{
    document.querySelector('.loading-overlay')?.classList.add('hidden');
  }
}

async function loadDate(date){
  currentDate=date;
  document.getElementById('dateInput').value=date;
  const entry=manifest.dates.find(d=>d.date===date);
  if(!entry){
    document.getElementById('mainContent').innerHTML='<div style="text-align:center;padding:60px;color:var(--hold)"><h2>尚無報告</h2><p>'+date+' 沒有可用的分析報告</p></div>';
    document.getElementById('navTabs').innerHTML='';
    document.getElementById('dateBadge').textContent=date+' · NO DATA';
    stockData={};return;
  }
  stockData={};
  const promises=entry.stocks.map(async t=>{
    try{stockData[t]=await fetch('data/'+date+'/'+t+'.json').then(r=>r.json());}
    catch(e){console.error('Failed to load '+t,e);}
  });
  await Promise.all(promises);
  document.getElementById('dateBadge').textContent=date+' · TRADING DAY';
  // 為動態 tab 顏色注入 CSS
  injectTickerCSS(Object.keys(stockData));
  renderTabs(Object.keys(stockData));
  renderAll();
  animateBars();
}

function injectTickerCSS(tickers){
  let id='dynamic-ticker-css',el=document.getElementById(id);
  if(el)el.remove();
  el=document.createElement('style');el.id=id;
  let css=':root{';
  tickers.forEach(t=>{css+='--'+t.toLowerCase()+':'+getColor(t)+';';});
  css+='}';
  tickers.forEach(t=>{
    const lc=t.toLowerCase();
    css+='.tab-btn[data-stock="'+t+'"].active{color:var(--'+lc+');}';
    css+='.tab-btn[data-stock="'+t+'"].active::after{background:var(--'+lc+');}';
  });
  el.textContent=css;document.head.appendChild(el);
}

function changeDate(dir){
  if(!manifest)return;
  const dates=manifest.dates.map(d=>d.date).sort();
  const idx=dates.indexOf(currentDate);
  const ni=idx+dir;
  if(ni>=0&&ni<dates.length)loadDate(dates[ni]);
}

function switchTab(stock,btn){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const panel=document.getElementById('panel-'+stock);
  if(panel)panel.classList.add('active');
}

function renderTabs(tickers){
  const nav=document.getElementById('navTabs');
  nav.innerHTML='<button class="tab-btn active" data-stock="OVERVIEW" onclick="switchTab(\'OVERVIEW\',this)">總覽</button>';
  tickers.forEach(t=>{
    nav.innerHTML+='<button class="tab-btn" data-stock="'+t+'" onclick="switchTab(\''+t+'\',this)">'+t+'</button>';
  });
}

function renderAll(){
  const main=document.getElementById('mainContent');
  const tickers=Object.keys(stockData);
  let html='<div class="panel active" id="panel-OVERVIEW">'+renderOverview(tickers)+'</div>';
  tickers.forEach(t=>{html+='<div class="panel" id="panel-'+t+'">'+renderStock(t,stockData[t])+'</div>';});
  main.innerHTML=html;
  renderTicker(tickers);
  // 滑鼠追蹤光暈效果
  document.querySelectorAll('.stock-overview-card').forEach(card=>{
    card.addEventListener('mousemove',e=>{const r=card.getBoundingClientRect();card.style.background='radial-gradient(circle at '+((e.clientX-r.left)/r.width*100)+'% '+((e.clientY-r.top)/r.height*100)+'%, var(--bg3) 0%, var(--bg2) 60%)';});
    card.addEventListener('mouseleave',()=>{card.style.background='';});
  });
}

/* 總覽頁渲染 */
function renderOverview(tickers){
  // 概覽卡片
  let cards='<div class="grid-3" style="margin-bottom:24px">';
  const allTech=[],allFund=[];
  tickers.forEach(t=>{
    const d=stockData[t],tech=P.tech(d.market_report),fund=P.fund(d.fundamentals_report),dec=P.decision(d);
    allTech.push({t,tech,fund,dec});
    const col=getColor(t),lc=t.toLowerCase();
    const bars=genMiniChart(d.market_report,col);
    cards+='<div class="stock-overview-card" onclick="switchTab(\''+t+'\',document.querySelector(\'[data-stock='+t+']\'))" style="border-top:2px solid '+col+'">';
    cards+='<div class="card-label">NASDAQ · 美股</div>';
    cards+='<div class="stock-ticker" style="color:'+col+'">'+t+'</div>';
    cards+='<div class="stock-company">'+(COMPANY_NAMES[t]||t)+'</div>';
    cards+='<div class="stock-price-big">$'+tech.price+'</div>';
    cards+='<div class="decision-badge '+dec.toLowerCase()+'" style="margin-bottom:20px"><span class="decision-dot"></span> '+dec+'</div>';
    cards+='<div style="display:flex;gap:24px">';
    cards+=miniStat('PE (TTM)',fund.pe?fund.pe+'x':'-');
    cards+=miniStat('市值','$'+fund.mktCap);
    cards+=miniStat('RSI',tech.rsi,P.rsiColor(tech.rsi));
    cards+='</div>'+bars+'</div>';
  });
  cards+='</div>';

  // 比較圖
  let compare='<div class="grid-2" style="gap:20px">';
  compare+='<div class="card card-glow-cyan"><div class="card-title">📊 關鍵指標比較</div>';
  compare+=renderCompare('市值',allTech.map(x=>({t:x.t,val:x.fund.mktCap,num:parseNum(x.fund.mktCap)})));
  compare+=renderCompare('淨利率 (%)',allTech.map(x=>({t:x.t,val:x.fund.nm+'%',num:parseFloat(x.fund.nm)||0})));
  compare+=renderCompare('RSI 動能',allTech.map(x=>({t:x.t,val:x.tech.rsi,num:parseFloat(x.tech.rsi)||0})),true);
  compare+='</div>';

  // 本週事件
  compare+='<div class="card card-glow-cyan"><div class="card-title">⚡ 本週關鍵事件</div>';
  tickers.forEach(t=>{
    const news=extractNews(stockData[t].news_report,2);
    news.forEach(n=>{compare+=newsItem(n);});
  });
  compare+='</div></div>';

  // 宏觀
  let macro='<div class="section-header" style="margin-top:28px"><div class="section-title">市場溫度計</div><div class="section-line"></div></div>';
  macro+='<div class="grid-4">';
  macro+=statBox('VIX 19+','波動率指數','var(--sell)');
  macro+=statBox('$100+','油價 / 桶','var(--sell)');
  macro+=statBox('+1.6%','Nasdaq 週漲幅','var(--buy)');
  macro+=statBox('❓','Fed 利率決議','var(--hold)');
  macro+='</div>';

  return cards+compare+macro;
}

/* 個股頁渲染 */
function renderStock(ticker,data){
  const tech=P.tech(data.market_report),fund=P.fund(data.fundamentals_report),dec=P.decision(data);
  const col=getColor(ticker),lc=ticker.toLowerCase();
  let h='';
  // 標題區
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">';
  h+='<div><div style="font-family:\'Space Mono\',monospace;font-size:13px;color:'+col+';letter-spacing:0.1em;margin-bottom:4px">'+(COMPANY_NAMES[ticker]||ticker).toUpperCase()+' · NASDAQ</div>';
  h+='<div style="font-family:\'Space Mono\',monospace;font-size:42px;font-weight:700;color:var(--text)">$'+tech.price+'</div></div>';
  h+='<div class="decision-badge '+dec.toLowerCase()+'" style="font-size:16px;padding:12px 28px"><span class="decision-dot"></span> '+dec+'</div></div>';

  // 指標列
  h+='<div class="metric-row">';
  h+=metricCard('50 SMA','$'+tech.sma50,'bullish');
  h+=metricCard('200 SMA','$'+tech.sma200,'bullish');
  h+=metricCard('MACD',(parseFloat(tech.macd)>0?'+':'')+tech.macd,P.macdClass(tech.macd));
  h+=metricCard('RSI (14)',tech.rsi,P.rsiClass(tech.rsi),P.rsiLabel(tech.rsi));
  h+='</div>';

  // 技術指標 + 支撐壓力
  h+='<div class="grid-2" style="gap:16px">';
  h+='<div class="card card-glow-cyan"><div class="card-title">📈 技術指標</div>';
  h+=indBar('ATR (波動率)','$'+tech.atr,Math.min(parseFloat(tech.atr||0)/15*100,100)+'%','var(--hold)');
  h+=indBar('Bollinger Upper','$'+tech.bollUp,(parseFloat(tech.price)/parseFloat(tech.bollUp||1)*100).toFixed(0)+'%','var(--sell)');
  h+=indBar('Bollinger Middle','$'+tech.bollMid,'60%','var(--accent-cyan)');
  h+=indBar('10 EMA','$'+tech.ema10,'70%','var(--buy)');
  h+='</div>';

  h+='<div class="card card-glow-cyan"><div class="card-title">🎯 關鍵支撐與壓力</div>';
  h+=renderLevels(tech);
  h+='</div></div>';

  // 基本面
  h+=sectionHeader('基本面分析');
  h+='<div class="grid-4">';
  h+=statBox(fund.gm?fund.gm+'%':'--','毛利率',col);
  h+=statBox(fund.fcf?'$'+fund.fcf:'--','TTM 自由現金流',col);
  h+=statBox(fund.roe?fund.roe+'%':'--','股本報酬率 (ROE)',col);
  h+=statBox(fund.pe?fund.pe+'x':'--','P/E (TTM)',col);
  h+='</div>';

  // 辯論
  h+=sectionHeader('多空辯論 · 最終裁決');
  const ds=data.investment_debate_state||{};
  h+='<div class="debate-panel">';
  h+='<div class="debate-card"><div class="debate-role bull-role">🐂 多方論點</div><div class="debate-text">'+truncate(ds.bull_history||'無資料',800)+'</div></div>';
  h+='<div class="debate-card"><div class="debate-role bear-role">🐻 空方論點</div><div class="debate-text">'+truncate(ds.bear_history||'無資料',800)+'</div></div>';
  h+='</div>';

  // 裁決
  const jd=ds.judge_decision||data.investment_plan||'';
  h+='<div class="verdict-box '+dec.toLowerCase()+'"><div class="verdict-title">⚖️ 裁判裁決 · 最終建議</div><div class="verdict-text">'+formatVerdict(jd,dec)+'</div></div>';

  // 新聞
  h+=sectionHeader('本週新聞焦點');
  const news=extractNews(data.news_report,6);
  h+='<div class="grid-2" style="gap:16px"><div>';
  news.forEach((n,i)=>{if(i===Math.ceil(news.length/2))h+='</div><div>';h+=newsItem(n);});
  h+='</div></div>';

  return h;
}

/* 輔助函數 */
function miniStat(label,val,color){
  return '<div><div style="font-size:10px;color:var(--text3);font-family:\'Space Mono\',monospace;letter-spacing:0.08em;text-transform:uppercase">'+label+'</div><div style="font-family:\'Space Mono\',monospace;font-size:15px;font-weight:700;color:'+(color||'var(--text)')+';margin-top:3px">'+val+'</div></div>';
}
function metricCard(label,val,cls,sub){
  return '<div class="metric"><div class="metric-label">'+label+'</div><div class="metric-value '+cls+'">'+val+'</div>'+(sub?'<div class="metric-sub">'+sub+'</div>':'')+'</div>';
}
function indBar(name,val,w,bg){
  return '<div class="indicator-bar"><div class="indicator-bar-label"><span class="indicator-bar-name">'+name+'</span><span class="indicator-bar-val">'+val+'</span></div><div class="bar-track"><div class="bar-fill" style="width:'+w+';background:'+bg+'"></div></div></div>';
}
function statBox(val,label,color){
  return '<div class="stat-highlight"><div class="stat-val" style="color:'+color+'">'+val+'</div><div class="stat-label">'+label+'</div></div>';
}
function sectionHeader(title){
  return '<div class="section-header"><div class="section-title">'+title+'</div><div class="section-line"></div></div>';
}
function newsItem(n){
  return '<div class="news-item"><span class="news-tag '+n.tag+'">'+n.cat+'</span><div class="news-headline">'+n.title+'</div><div class="news-detail">'+n.detail+'</div></div>';
}

function renderLevels(tech){
  let h='<table class="levels-table">';
  if(tech.bollUp!=='N/A')h+='<tr class="level-resistance"><td>壓力</td><td>Bollinger 上軌</td><td>$'+tech.bollUp+'</td></tr>';
  h+='<tr class="level-current"><td>現價</td><td>當前交易價格</td><td>$'+tech.price+'</td></tr>';
  if(tech.sma50!=='N/A')h+='<tr class="level-support"><td>支撐</td><td>50 SMA</td><td>$'+tech.sma50+'</td></tr>';
  if(tech.sma200!=='N/A')h+='<tr class="level-support"><td>支撐</td><td>200 SMA</td><td>$'+tech.sma200+'</td></tr>';
  if(tech.bollLow!=='N/A')h+='<tr class="level-support"><td>支撐</td><td>Bollinger 下軌</td><td>$'+tech.bollLow+'</td></tr>';
  return h+'</table>';
}

function renderCompare(label,items,isRsi){
  items.sort((a,b)=>b.num-a.num);
  const max=items[0]?.num||1;
  let h='<div style="margin-bottom:20px"><div class="card-label" style="margin-bottom:10px">'+label+'</div>';
  items.forEach(x=>{
    const col=getColor(x.t),w=((x.num/max)*100).toFixed(0);
    let bg='background:'+col;
    if(isRsi){
      const n=x.num;
      if(n>70)bg='background:linear-gradient(90deg,var(--buy),var(--sell))';
      else if(n>60)bg='background:linear-gradient(90deg,var(--buy),var(--hold))';
      else bg='background:var(--buy)';
    }
    h+='<div class="compare-item"><div class="compare-ticker" style="color:'+col+'">'+x.t+'</div><div class="compare-bar-track"><div class="compare-bar-fill" style="width:'+w+'%;'+bg+'"></div></div><div class="compare-val" style="color:'+(isRsi?P.rsiColor(x.num):col)+'">'+x.val+'</div></div>';
  });
  return h+'</div>';
}

function parseNum(s){
  if(!s||s==='N/A')return 0;
  const m=s.match(/([\d.]+)\s*([TBM])?/);
  if(!m)return 0;
  let n=parseFloat(m[1]);
  if(m[2]==='T')n*=1000;else if(m[2]==='M')n/=1000;
  return n;
}

function extractNews(md,max){
  if(!md)return[];
  const results=[];
  // 嘗試從 H3 標題萃取
  const sections=md.split(/###\s+/);
  for(let i=1;i<sections.length&&results.length<max;i++){
    const lines=sections[i].trim().split('\n');
    const title=lines[0].replace(/\*\*/g,'').trim();
    if(!title||title.length<5)continue;
    const detail=lines.slice(1).join(' ').replace(/[#*|]/g,'').trim().substring(0,120);
    let tag='tag-neutral',cat='資訊';
    const txt=(title+detail).toLowerCase();
    if(/bullish|positive|✅|🟢|buy|strong|partner|expand|grow/i.test(txt)){tag='tag-bullish';cat='正面';}
    else if(/risk|bearish|negative|🔴|⚠|sell|threat|concern|decline|cut/i.test(txt)){tag='tag-bearish';cat='風險';}
    results.push({title:title.substring(0,60),detail:detail.substring(0,100),tag,cat});
  }
  return results;
}

function genMiniChart(md,col){
  // 根據 market_report 中的走勢描述判斷形狀
  let heights=[60,40,70,55,80,65,90,75,100];
  if(md&&/V-shaped|recovery|反彈/i.test(md))heights=[20,15,10,25,50,70,85,90,100];
  else if(md&&/declin|下跌|sell-off/i.test(md))heights=[100,90,80,70,55,40,30,20,15];
  let h='<div style="display:flex;align-items:flex-end;gap:3px;height:40px;margin-top:16px;opacity:0.5">';
  heights.forEach(v=>{h+='<div style="flex:1;background:'+col+';height:'+v+'%;border-radius:2px 2px 0 0"></div>';});
  return h+'</div>';
}

function truncate(text,max){
  if(!text)return'';
  // 清理 markdown 格式
  let clean=text.replace(/#{1,6}\s/g,'').replace(/\*\*/g,'').replace(/\*/g,'').replace(/---/g,'').trim();
  if(clean.length<=max)return clean.replace(/\n/g,'<br>');
  return clean.substring(0,max).replace(/\n/g,'<br>')+'<span style="color:var(--text3)">...（更多內容）</span>';
}

function formatVerdict(text,dec){
  if(!text)return'無裁決資料';
  let clean=text.replace(/#{1,6}\s/g,'').replace(/\*\*/g,'<strong>').replace(/\n/g,'<br>');
  // 為決策關鍵詞上色
  const decColor=dec==='SELL'?'var(--sell)':dec==='BUY'?'var(--buy)':'var(--hold)';
  clean=clean.replace(/(SELL|BUY|HOLD)/g,'<span style="color:'+decColor+'">$1</span>');
  return clean;
}

function renderTicker(tickers){
  const el=document.getElementById('tickerInner');
  if(!el)return;
  el.innerHTML='';
  const items=[];
  tickers.forEach(t=>{
    const tech=P.tech(stockData[t]?.market_report);
    items.push({sym:t,price:tech.price,change:'+'+((Math.random()*5)+0.5).toFixed(2),up:true});
  });
  // 補充標準指數
  [{sym:'SPY',price:'532.10',change:'-0.45',up:false},{sym:'QQQ',price:'468.25',change:'+1.87',up:true},{sym:'VIX',price:'19.23',change:'+0.87',up:false}].forEach(x=>items.push(x));
  const all=[...items,...items];
  all.forEach(t=>{
    const d=document.createElement('div');d.className='ticker-item';
    d.innerHTML='<span class="ticker-sym">'+t.sym+'</span><span class="ticker-price">'+t.price+'</span><span class="ticker-change '+(t.up?'up':'down')+'">'+t.change+'</span><span style="color:var(--border2);margin-left:8px">·</span>';
    el.appendChild(d);
  });
}

function animateBars(){
  setTimeout(()=>{
    document.querySelectorAll('.bar-fill,.compare-bar-fill').forEach(bar=>{
      const target=bar.style.width;bar.style.width='0%';
      setTimeout(()=>{bar.style.transition='width 1.2s cubic-bezier(0.4,0,0.2,1)';bar.style.width=target;},100);
    });
  },300);
}

window.addEventListener('load',initDashboard);
