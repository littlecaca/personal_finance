from flask import Flask, render_template, request, redirect, url_for, jsonify
import json
import os
from datetime import datetime
import math

app = Flask(__name__)
DATA_DIR = 'data'
CONFIG_FILE = os.path.join(DATA_DIR, 'config.json')
METADATA_FILE = os.path.join(DATA_DIR, 'metadata.json')

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

DEFAULT_CONFIG = {
    "assets": {
        "股票 (Stocks)": 0,
        "加密货币 (Crypto)": 0,
        "银行存款 (Deposits)": 0,
        "基金 (Funds)": 0
    },
    "categories": {
        "房租水电": { "limit": 3000, "initial": 2500 },
        "餐饮美食": { "limit": 2000, "initial": 0 },
        "交通出行": { "limit": 500, "initial": 0 },
        "日常购物": { "limit": 1000, "initial": 0 }
    }
}

def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return default

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def get_month_file(year_month):
    return os.path.join(DATA_DIR, f"{year_month}.json")

def update_metadata(year_month, count):
    meta = load_json(METADATA_FILE, {"counts": {}})
    meta["counts"][year_month] = count
    save_json(METADATA_FILE, meta)

def get_app_data(target_month, page=1, per_page=8):
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    meta = load_json(METADATA_FILE, {"counts": {}})
    
    month_data = load_json(get_month_file(target_month), {"expenses": []})
    all_expenses = month_data["expenses"]
    
    category_totals = {}
    for cat, details in config["categories"].items():
        category_totals[cat] = float(details.get("initial", 0))
    
    total_month_spend = sum(category_totals.values())
    for exp in all_expenses:
        cat = exp.get("category")
        amount = float(exp.get("amount", 0))
        if cat in category_totals:
            category_totals[cat] += amount
            total_month_spend += amount

    total_count = len(all_expenses)
    total_pages = math.ceil(total_count / per_page) if total_count > 0 else 1
    page = max(1, min(page, total_pages))
    
    start_idx = (page - 1) * per_page
    paginated_expenses = all_expenses[start_idx:start_idx + per_page]
    
    return {
        "assets": config["assets"],
        "categories": config["categories"],
        "category_totals": category_totals,
        "total_month_spend": total_month_spend,
        "expenses": paginated_expenses,
        "metadata": meta["counts"],
        "current_month": target_month,
        "pagination": {
            "current_page": page,
            "total_pages": total_pages,
            "total_count": total_count,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }

@app.route('/')
def index():
    target_month = request.args.get('month', datetime.now().strftime("%Y-%m"))
    page = int(request.args.get('page', 1))
    app_data = get_app_data(target_month, page)
    return render_template('index.html', app_data=app_data)

@app.route('/settings')
def settings():
    target_month = request.args.get('month', datetime.now().strftime("%Y-%m"))
    app_data = get_app_data(target_month)
    return render_template('settings.html', app_data=app_data)

@app.route('/api/add_expense', methods=['POST'])
def add_expense():
    amount = float(request.form['amount'])
    description = request.form['description']
    category = request.form['category']
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d %H:%M")
    year_month = now.strftime("%Y-%m")
    
    month_file = get_month_file(year_month)
    month_data = load_json(month_file, {"expenses": []})
    month_data['expenses'].insert(0, {"date": date_str, "amount": amount, "description": description, "category": category})
    save_json(month_file, month_data)
    update_metadata(year_month, len(month_data['expenses']))
    return redirect(url_for('index', month=year_month))

@app.route('/api/delete_expense/<month>/<int:index>')
def delete_expense(month, index):
    month_file = get_month_file(month)
    month_data = load_json(month_file, {"expenses": []})
    if 0 <= index < len(month_data['expenses']):
        month_data['expenses'].pop(index)
        save_json(month_file, month_data)
        update_metadata(month, len(month_data['expenses']))
    return redirect(url_for('index', month=month))

@app.route('/api/update_asset', methods=['POST'])
def update_asset():
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    category = request.form['category']
    action = request.form['action']
    amount = float(request.form['amount'])
    if category in config['assets']:
        if action == 'add': config['assets'][category] += amount
        elif action == 'set': config['assets'][category] = amount
        if config['assets'][category] < 0: config['assets'][category] = 0
    save_json(CONFIG_FILE, config)
    return redirect(url_for('index', month=request.form.get('current_month')))

@app.route('/api/manage_category', methods=['POST'])
def manage_category():
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    name = request.form['name']
    limit = float(request.form['limit'])
    initial = float(request.form['initial'])
    old_name = request.form.get('old_name')
    if old_name and old_name in config['categories']:
        if old_name != name: del config['categories'][old_name]
    config['categories'][name] = {"limit": limit, "initial": initial}
    save_json(CONFIG_FILE, config)
    
    if request.form.get('from_page') == 'settings':
        return redirect(url_for('settings', month=request.form.get('current_month')))
    return redirect(url_for('index', month=request.form.get('current_month')))

@app.route('/api/delete_category/<name>')
def delete_category(name):
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    if name in config['categories']:
        del config['categories'][name]
        save_json(CONFIG_FILE, config)
    
    if request.args.get('from_page') == 'settings':
        return redirect(url_for('settings'))
    return redirect(url_for('index'))

@app.route('/api/add_asset_category', methods=['POST'])
def add_asset_category():
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    name = request.form['name']
    if name and name not in config['assets']:
        config['assets'][name] = 0
        save_json(CONFIG_FILE, config)
    
    if request.form.get('from_page') == 'settings':
        return redirect(url_for('settings'))
    return redirect(url_for('index'))

@app.route('/api/delete_asset_category/<name>')
def delete_asset_category(name):
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    if name in config['assets']:
        del config['assets'][name]
        save_json(CONFIG_FILE, config)
    
    if request.args.get('from_page') == 'settings':
        return redirect(url_for('settings'))
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)
