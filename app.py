from flask import Flask, render_template, request, redirect, url_for, jsonify
import json
import os
from datetime import datetime, timedelta
import math

app = Flask(__name__)
DATA_DIR = 'data'
CONFIG_FILE = os.path.join(DATA_DIR, 'config.json')
METADATA_FILE = os.path.join(DATA_DIR, 'metadata.json')

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

DEFAULT_CONFIG = {
    "assets": {"股票 (Stocks)": 0, "加密货币 (Crypto)": 0, "银行存款 (Deposits)": 0, "基金 (Funds)": 0},
    "categories": {
        "房租水电": { "limit": 3000, "initial": 2500, "rollover": False },
        "餐饮美食": { "limit": 2000, "initial": 0, "rollover": True },
        "交通出行": { "limit": 500, "initial": 0, "rollover": False },
        "日常购物": { "limit": 1000, "initial": 0, "rollover": False }
    },
    "surplus_target": ""
}

def load_json(path, default):
    if not os.path.exists(path): return default
    with open(path, 'r', encoding='utf-8') as f:
        try: return json.load(f)
        except: return default

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def get_month_file(year_month):
    return os.path.join(DATA_DIR, f"{year_month}.json")

def check_and_process_surplus():
    """精细化全量追溯：支持类别独立结转和全局合并结转"""
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    global_target = config.get("surplus_target")
    meta = load_json(METADATA_FILE, {"counts": {}, "rolled_over_months": []})
    current_month_str = datetime.now().strftime("%Y-%m")
    recorded_months = sorted(meta["counts"].keys())
    rolled_over = set(meta.get("rolled_over_months", []))

    for month_str in recorded_months:
        if month_str < current_month_str and month_str not in rolled_over:
            month_file = get_month_file(month_str)
            if not os.path.exists(month_file): continue

            m_data = load_json(month_file, {"expenses": [], "adjustments": {}, "budget_snapshot": {}})
            # 优先使用快照，确保结转逻辑基于当时各类别属性
            ref_cats = m_data.get("budget_snapshot") if m_data.get("budget_snapshot") else config["categories"]
            
            # 计算该月各类别实际支出（固定 + 动态）
            cat_spends = {cat: float(d["initial"]) for cat, d in ref_cats.items()}
            for exp in m_data["expenses"]:
                if exp["category"] in cat_spends:
                    cat_spends[exp["category"]] += float(exp["amount"])

            # 准备下个月的结转数据
            dt = datetime.strptime(month_str, "%Y-%m")
            next_month_str = ((dt.replace(day=28) + timedelta(days=4)).replace(day=1)).strftime("%Y-%m")
            next_file = get_month_file(next_month_str)
            next_data = load_json(next_file, {"expenses": [], "adjustments": {}, "budget_snapshot": {}})
            if "adjustments" not in next_data: next_data["adjustments"] = {}

            for cat, details in ref_cats.items():
                # 该类别总上限 = 基础上限 + 该月获得的结转补充
                cat_limit = float(details["limit"]) + float(m_data.get("adjustments", {}).get(cat, 0))
                cat_surplus = cat_limit - cat_spends.get(cat, 0)
                
                if cat_surplus > 0:
                    # 判断结转路径
                    if details.get("rollover"):
                        # 1. 类别开启了独立结转：给下个月的自己
                        next_data["adjustments"][cat] = next_data["adjustments"].get(cat, 0) + cat_surplus
                    elif global_target and global_target in config["categories"]:
                        # 2. 类别未开启：给全局目标
                        next_data["adjustments"][global_target] = next_data["adjustments"].get(global_target, 0) + cat_surplus

            save_json(next_file, next_data)
            if next_month_str not in meta["counts"]:
                meta["counts"][next_month_str] = len(next_data["expenses"])

            meta.setdefault("rolled_over_months", []).append(month_str)
            save_json(METADATA_FILE, meta)

def get_app_data(target_month, page=1, per_page=8):
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    meta = load_json(METADATA_FILE, {"counts": {}, "rolled_over_months": []})
    month_data = load_json(get_month_file(target_month), {"expenses": [], "adjustments": {}, "budget_snapshot": {}})
    active_categories = month_data.get("budget_snapshot") if month_data.get("budget_snapshot") else config["categories"]
    
    category_totals = {cat: float(d["initial"]) for cat, d in active_categories.items()}
    category_limits = {cat: float(d["limit"]) + float(month_data.get("adjustments", {}).get(cat, 0)) for cat, d in active_categories.items()}
    
    for exp in month_data["expenses"]:
        if exp["category"] in category_totals:
            category_totals[exp["category"]] += float(exp["amount"])

    total_count = len(month_data["expenses"])
    total_pages = max(1, math.ceil(total_count / per_page))
    page = max(1, min(page, total_pages))
    
    return {
        "assets": config["assets"],
        "categories": config["categories"],
        "active_categories": active_categories,
        "category_totals": category_totals,
        "category_limits": category_limits,
        "total_month_spend": sum(category_totals.values()),
        "total_month_limit": sum(category_limits.values()),
        "expenses": month_data["expenses"][(page-1)*per_page : page*per_page],
        "metadata": meta["counts"],
        "current_month": target_month,
        "surplus_target": config.get("surplus_target", ""),
        "pagination": {"current_page": page, "total_pages": total_pages, "total_count": total_count, "has_next": page < total_pages, "has_prev": page > 1}
    }

@app.route('/')
def index():
    check_and_process_surplus()
    target_month = request.args.get('month', datetime.now().strftime("%Y-%m"))
    page = int(request.args.get('page', 1))
    return render_template('index.html', app_data=get_app_data(target_month, page))

@app.route('/settings')
def settings():
    check_and_process_surplus()
    target_month = request.args.get('month', datetime.now().strftime("%Y-%m"))
    return render_template('settings.html', app_data=get_app_data(target_month))

@app.route('/api/set_surplus_target', methods=['POST'])
def set_surplus_target():
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    config["surplus_target"] = request.form.get("target", "")
    save_json(CONFIG_FILE, config)
    return redirect(url_for('settings'))

@app.route('/api/add_expense', methods=['POST'])
def add_expense():
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    now = datetime.now()
    ym = now.strftime("%Y-%m")
    m_file = get_month_file(ym)
    m_data = load_json(m_file, {"expenses": [], "adjustments": {}, "budget_snapshot": {}})
    m_data["budget_snapshot"] = config["categories"]
    m_data['expenses'].insert(0, {"date": now.strftime("%Y-%m-%d %H:%M"), "amount": float(request.form['amount']), "description": request.form['description'], "category": request.form['category']})
    save_json(m_file, m_data)
    meta = load_json(METADATA_FILE, {"counts": {}})
    meta.setdefault("counts", {})[ym] = len(m_data['expenses'])
    save_json(METADATA_FILE, meta)
    return redirect(url_for('index', month=ym))

@app.route('/api/delete_expense/<month>/<int:index>')
def delete_expense(month, index):
    m_file = get_month_file(month)
    m_data = load_json(m_file, {"expenses": [], "adjustments": {}, "budget_snapshot": {}})
    if 0 <= index < len(m_data['expenses']):
        m_data['expenses'].pop(index)
        save_json(m_file, m_data)
        meta = load_json(METADATA_FILE, {"counts": {}})
        meta.setdefault("counts", {})[month] = len(m_data['expenses'])
        save_json(METADATA_FILE, meta)
    return redirect(url_for('index', month=month))

@app.route('/api/update_asset', methods=['POST'])
def update_asset():
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    cat, act, amt = request.form['category'], request.form['action'], float(request.form['amount'])
    if cat in config['assets']:
        if act == 'add': config['assets'][cat] += amt
        elif act == 'set': config['assets'][cat] = amt
        config['assets'][cat] = max(0, config['assets'][cat])
    save_json(CONFIG_FILE, config)
    return redirect(url_for('index', month=request.form.get('current_month')))

@app.route('/api/manage_category', methods=['POST'])
def manage_category():
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    name = request.form['name']
    limit = float(request.form['limit'])
    initial = float(request.form['initial'])
    # 处理布尔值：Checkbox 选中时有值，未选中时无此 Key
    rollover = True if request.form.get('rollover') else False
    old_name = request.form.get('old_name')
    
    if old_name and old_name in config['categories']:
        if old_name != name: del config['categories'][old_name]
    
    config['categories'][name] = {"limit": limit, "initial": initial, "rollover": rollover}
    save_json(CONFIG_FILE, config)
    
    ym = datetime.now().strftime("%Y-%m")
    m_file = get_month_file(ym)
    if os.path.exists(m_file):
        m_data = load_json(m_file, {})
        m_data["budget_snapshot"] = config["categories"]
        save_json(m_file, m_data)
        
    return redirect(url_for('settings' if request.form.get('from_page') == 'settings' else 'index', month=request.form.get('current_month')))

@app.route('/api/delete_category/<name>')
def delete_category(name):
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    if name in config['categories']:
        del config['categories'][name]
        if config.get("surplus_target") == name: config["surplus_target"] = ""
        save_json(CONFIG_FILE, config)
    return redirect(url_for('settings' if request.args.get('from_page') == 'settings' else 'index'))

@app.route('/api/add_asset_category', methods=['POST'])
def add_asset_category():
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    name = request.form['name']
    if name and name not in config['assets']:
        config['assets'][name] = 0
        save_json(CONFIG_FILE, config)
    return redirect(url_for('settings' if request.form.get('from_page') == 'settings' else 'index'))

@app.route('/api/delete_asset_category/<name>')
def delete_asset_category(name):
    config = load_json(CONFIG_FILE, DEFAULT_CONFIG)
    if name in config['assets']:
        del config['assets'][name]
        save_json(CONFIG_FILE, config)
    return redirect(url_for('settings' if request.args.get('from_page') == 'settings' else 'index'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)
