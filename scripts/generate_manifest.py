import os
import json
from datetime import datetime

# 目錄設定
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, 'data')
MANIFEST_PATH = os.path.join(DATA_DIR, 'manifest.json')

def generate_manifest():
    if not os.path.exists(DATA_DIR):
        print(f"Directory {DATA_DIR} does not exist.")
        return

    dates_data = []
    
    # 掃描 data 目錄下的所有資料夾（預期名稱為 YYYY-MM-DD）
    for item in os.listdir(DATA_DIR):
        item_path = os.path.join(DATA_DIR, item)
        # 只處理符合 YYYY-MM-DD 格式的目錄
        if os.path.isdir(item_path):
            try:
                # 驗證資料夾名稱是否為日期
                datetime.strptime(item, '%Y-%m-%d')
                
                # 收集該日期資料夾中的 JSON 檔案作為股票代碼
                stocks = []
                for file in os.listdir(item_path):
                    if file.endswith('.json'):
                        ticker = file.replace('.json', '')
                        stocks.append(ticker)
                
                if stocks:
                    dates_data.append({
                        "date": item,
                        "stocks": sorted(stocks)
                    })
            except ValueError:
                # 不是 YYYY-MM-DD 格式的目錄就跳過
                continue

    # 按日期遞減排序（最新日期在最前面）
    dates_data.sort(key=lambda x: x['date'], reverse=True)
    
    latest_date = dates_data[0]['date'] if dates_data else ""

    manifest = {
        "latest": latest_date,
        "dates": dates_data
    }

    # 寫入 manifest.json
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        
    print(f"Manifest generated successfully. Latest date: {latest_date}, Total dates: {len(dates_data)}")

if __name__ == '__main__':
    generate_manifest()
