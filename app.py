from flask import Flask, render_template, request, redirect, url_for
import json
import os
from datetime import datetime

app = Flask(__name__)
DATA_FILE = 'data.json'

# 默认数据结构，包含500万的目标和预设资产分类
DEFAULT_DATA = {
    "goal": 5000000,
    "assets": {
        "股票 (Stocks)": 0,
        "加密货币 (Crypto)": 0,
        "银行存款 (Deposits)": 0,
        "基金 (Funds)": 0
    },
    "expenses": []
}

def load_data():
    if not os.path.exists(DATA_FILE):
        return DEFAULT_DATA
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return DEFAULT_DATA

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

@app.route('/')
def index():
    data = load_data()
    total_assets = sum(float(v) for v in data['assets'].values())
    # 计算进度，最高100%
    progress = min((total_assets / data['goal']) * 100, 100) if data['goal'] > 0 else 0
    
    return render_template('index.html', 
                           data=data, 
                           total_assets=total_assets, 
                           progress=progress)

@app.route('/update_assets', methods=['POST'])
def update_assets():
    data = load_data()
    for key in data['assets'].keys():
        if key in request.form and request.form[key].strip() != '':
            data['assets'][key] = float(request.form[key])
    save_data(data)
    return redirect(url_for('index'))

@app.route('/add_expense', methods=['POST'])
def add_expense():
    data = load_data()
    amount = float(request.form['amount'])
    description = request.form['description']
    date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # 将新开销插入到列表最前面
    data['expenses'].insert(0, {
        "date": date_str,
        "amount": amount,
        "description": description
    })
    
    # 仅保留最近50条记录以防文件过大
    data['expenses'] = data['expenses'][:50]
    save_data(data)
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)