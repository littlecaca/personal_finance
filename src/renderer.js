let appData = null;
let assetChartInstance = null;
let historyChartInstance = null;

const formatCurrency = (num) => parseFloat(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const updateUI = async () => {
    if (window.location.pathname.endsWith('settings.html')) {
        await renderSettings();
    } else {
        await renderDashboard();
    }
};

const renderDashboard = async (month, page) => {
    appData = await window.financeAPI.getAppData(month, page);
    
    // Header
    document.getElementById('currentMonthLabel').innerText = appData.current_month;
    
    // Spend Display
    document.getElementById('totalMonthSpendDisplay').innerHTML = `¥ ${formatCurrency(appData.total_month_spend)} <span class="fs-5 text-muted">/ ¥ ${formatCurrency(appData.total_month_limit)}</span>`;
    
    // Budget Progress
    const progContainer = document.getElementById('budgetProgressContainer');
    progContainer.innerHTML = '';
    for (const cat in appData.active_categories) {
        const limit = appData.category_limits[cat] || appData.active_categories[cat].limit;
        const spent = appData.category_totals[cat] || 0;
        const percent = limit > 0 ? (spent / limit) * 100 : 0;
        const colorClass = percent >= 100 ? 'bg-danger' : (percent >= 80 ? 'bg-warning' : 'bg-success');
        const displayPercent = Math.min(percent, 100);

        const div = document.createElement('div');
        div.className = 'mb-3';
        div.innerHTML = `
            <div class="d-flex justify-content-between small mb-1">
                <span class="fw-bold">${cat}</span>
                <span class="${percent >= 100 ? 'text-danger fw-bold' : 'text-muted'}">¥${formatCurrency(spent)} / ¥${formatCurrency(limit)}</span>
            </div>
            <div class="progress" style="height: 8px;">
                <div class="progress-bar ${colorClass} progress-bar-striped" role="progressbar" style="width: ${displayPercent}%"></div>
            </div>`;
        progContainer.appendChild(div);
    }

    // Year & Month Selectors
    const yearSelector = document.getElementById('yearSelector');
    const monthSelector = document.getElementById('monthSelector');
    
    const [curYear, curMonth] = appData.current_month.split('-');
    
    // Populate Years based on history + current
    const recordedYears = new Set(Object.keys(appData.metadata).map(m => m.split('-')[0]));
    recordedYears.add(new Date().getFullYear().toString());
    recordedYears.add(curYear);
    
    yearSelector.innerHTML = '';
    Array.from(recordedYears).sort().reverse().forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.innerText = `${y}年`;
        opt.selected = (y === curYear);
        yearSelector.appendChild(opt);
    });

    monthSelector.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        const m = String(i).padStart(2, '0');
        const opt = document.createElement('option');
        opt.value = m;
        opt.innerText = `${i}月`;
        opt.selected = (m === curMonth);
        monthSelector.appendChild(opt);
    }

    const handleDateChange = () => {
        const target = `${yearSelector.value}-${monthSelector.value}`;
        renderDashboard(target);
    };
    yearSelector.onchange = handleDateChange;
    monthSelector.onchange = handleDateChange;

    // Expense Category Selector
    const expenseCatSelect = document.getElementById('expenseCategory');
    expenseCatSelect.innerHTML = '';
    for (const cat in appData.active_categories) {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        expenseCatSelect.appendChild(opt);
    }

    // Expense List
    const listBody = document.getElementById('expenseListBody');
    listBody.innerHTML = '';
    if (appData.expenses.length === 0) {
        listBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">本月暂无记录</td></tr>';
    } else {
        appData.expenses.forEach((exp, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-muted small">${exp.date}</td>
                <td><span class="badge bg-light text-dark border">${exp.category}</span></td>
                <td>${exp.description}</td>
                <td class="text-end text-danger fw-medium">-¥${formatCurrency(exp.amount)}</td>
                <td class="text-center">
                    <button class="btn btn-link text-danger p-0 border-0" onclick="deleteExpense('${appData.current_month}', ${idx})">✖</button>
                </td>`;
            listBody.appendChild(tr);
        });
    }

    // Pagination
    document.getElementById('currentPageLabel').innerText = `(第 ${appData.pagination.current_page} 页)`;
    document.getElementById('totalCountLabel').innerText = `共 ${appData.pagination.total_count} 条`;
    const pagControls = document.getElementById('paginationControls');
    pagControls.innerHTML = '';
    if (appData.pagination.total_pages > 1) {
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${!appData.pagination.has_prev ? 'disabled' : ''}`;
        prevLi.innerHTML = `<button class="page-link">上一页</button>`;
        prevLi.onclick = () => appData.pagination.has_prev && renderDashboard(appData.current_month, appData.pagination.current_page - 1);
        pagControls.appendChild(prevLi);

        for (let i = 1; i <= appData.pagination.total_pages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === appData.pagination.current_page ? 'active' : ''}`;
            li.innerHTML = `<button class="page-link">${i}</button>`;
            li.onclick = () => renderDashboard(appData.current_month, i);
            pagControls.appendChild(li);
        }

        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${!appData.pagination.has_next ? 'disabled' : ''}`;
        nextLi.innerHTML = `<button class="page-link">下一页</button>`;
        nextLi.onclick = () => appData.pagination.has_next && renderDashboard(appData.current_month, appData.pagination.current_page + 1);
        pagControls.appendChild(nextLi);
    }

    // Assets
    const totalAssets = Object.values(appData.assets).reduce((sum, val) => sum + parseFloat(val), 0);
    document.getElementById('totalAssetsDisplay').innerText = `¥ ${formatCurrency(totalAssets)}`;
    
    const assetList = document.getElementById('assetList');
    assetList.innerHTML = '';
    for (const [cat, amount] of Object.entries(appData.assets)) {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center border-top';
        li.innerHTML = `
            <div><span class="fw-bold">${cat}</span><br><span class="text-muted small">¥${formatCurrency(amount)}</span></div>
            <div class="d-flex gap-1">
                <input type="number" step="0.01" class="form-control form-control-sm" id="input-${cat}" style="width: 80px;">
                <button class="btn btn-sm btn-outline-success px-2" onclick="submitAsset('${cat}', 'add')">+/-</button>
                <button class="btn btn-sm btn-outline-primary px-2" onclick="submitAsset('${cat}', 'set')">设</button>
            </div>`;
        assetList.appendChild(li);
    }
    updateAssetChart();
    updateHistoryChart();
};

// --- Drag and Drop Helper ---
const setupDraggableList = (listId, onReorder) => {
    const list = document.getElementById(listId);
    let draggedItem = null;

    list.addEventListener('dragstart', (e) => {
        draggedItem = e.target.closest('li');
        if (!draggedItem) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedItem.dataset.name);
        setTimeout(() => draggedItem.classList.add('opacity-50'), 0);
    });

    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetItem = e.target.closest('li');
        if (targetItem && targetItem !== draggedItem && targetItem.parentNode === list) {
            const rect = targetItem.getBoundingClientRect();
            const next = (e.clientY - rect.top)/(rect.bottom - rect.top) > .5;
            list.insertBefore(draggedItem, next && targetItem.nextSibling || targetItem);
        }
    });

    list.addEventListener('dragend', (e) => {
        if (!draggedItem) return;
        draggedItem.classList.remove('opacity-50');
        draggedItem = null;
        
        const newOrder = Array.from(list.querySelectorAll('li')).map(li => li.dataset.name);
        onReorder(newOrder);
    });
};

const renderSettings = async () => {
    appData = await window.financeAPI.getAppData();
    
    // Surplus Target Select
    const targetSelect = document.getElementById('surplusTargetSelect');
    targetSelect.innerHTML = '<option value="">禁用汇总结转</option>';
    for (const cat in appData.categories) {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        opt.selected = (cat === appData.surplus_target);
        targetSelect.appendChild(opt);
    }
    
    targetSelect.onchange = async (e) => {
        await window.financeAPI.setSurplusTarget(e.target.value);
        updateUI();
    };

    // Budget Category List
    const catList = document.getElementById('categoryList');
    catList.innerHTML = '';
    for (const [cat, data] of Object.entries(appData.categories)) {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center py-2';
        li.draggable = true;
        li.dataset.name = cat;
        li.style.cursor = 'grab';
        li.innerHTML = `
            <div>
                <span class="text-muted me-2">☰</span>
                <span class="fw-bold">${cat}</span>
                ${data.rollover ? '<span class="badge rounded-pill bg-success ms-1" style="font-size: 0.65rem;">独立结转 ON</span>' : ''}
                ${cat === appData.surplus_target ? '<span class="badge rounded-pill bg-primary ms-1" style="font-size: 0.65rem;">全局目标</span>' : ''}
                <br>
                <span class="text-muted small ms-4">上限: ¥${data.limit} | 固定: ¥${data.initial}</span>
            </div>
            <div class="d-flex gap-1 item-actions">
                <button class="btn btn-sm btn-outline-primary px-2" onclick="editCat('${cat}', ${data.limit}, ${data.initial}, ${data.rollover})">编辑</button>
                <button class="btn btn-sm btn-outline-danger px-2" onclick="deleteCategory('${cat}')">✖</button>
            </div>`;
        catList.appendChild(li);
    }
    setupDraggableList('categoryList', async (newOrder) => {
        await window.financeAPI.reorderCategories(newOrder);
        updateUI();
    });

    // Asset Category List
    const assetCatList = document.getElementById('assetCategoryList');
    assetCatList.innerHTML = '';
    for (const cat of Object.keys(appData.assets)) {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center py-2';
        li.draggable = true;
        li.dataset.name = cat;
        li.style.cursor = 'grab';
        li.innerHTML = `
            <div>
                <span class="text-muted me-2">☰</span>
                <span class="fw-bold">${cat}</span>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-outline-danger px-2" onclick="deleteAssetCategory('${cat}')">✖</button>
            </div>`;
        assetCatList.appendChild(li);
    }
    setupDraggableList('assetCategoryList', async (newOrder) => {
        await window.financeAPI.reorderAssetCategories(newOrder);
        updateUI();
    });
};

// --- Actions ---
window.deleteExpense = async (month, index) => {
    await window.financeAPI.deleteExpense(month, index);
    updateUI();
};

window.submitAsset = async (cat, action) => {
    const val = document.getElementById(`input-${cat}`).value;
    if (!val) return;
    await window.financeAPI.updateAsset({ category: cat, action, amount: val });
    updateUI();
};

window.editCat = (cat, limit, initial, rollover) => {
    document.getElementById('newCategoryInput').value = cat;
    document.getElementById('newCategoryLimit').value = limit;
    document.getElementById('newCategoryInitial').value = initial;
    document.getElementById('rolloverToggle').checked = rollover;
    document.getElementById('oldCategoryName').value = cat;
    const btn = document.getElementById('submitCategoryBtn');
    btn.innerText = '保存修改';
    btn.classList.replace('btn-secondary', 'btn-primary');
};

window.deleteCategory = async (name) => {
    if (confirm(`确定要删除类别 "${name}" 吗？`)) {
        await window.financeAPI.deleteCategory(name);
        updateUI();
    }
};

window.deleteAssetCategory = async (name) => {
    if (confirm(`确定要删除资产类别 "${name}" 吗？`)) {
        await window.financeAPI.deleteAssetCategory(name);
        updateUI();
    }
};

// --- Form Submissions ---
document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    if (form.id === 'addExpenseForm') {
        const formData = new FormData(form);
        await window.financeAPI.addExpense({
            category: formData.get('category'),
            amount: formData.get('amount'),
            description: formData.get('description')
        });
        form.reset();
        updateUI();
    } else if (form.id === 'surplusTargetForm') {
        const formData = new FormData(form);
        await window.financeAPI.setSurplusTarget(formData.get('target'));
        updateUI();
    } else if (form.id === 'manageCategoryForm') {
        const formData = new FormData(form);
        await window.financeAPI.manageCategory({
            name: formData.get('name'),
            limit: formData.get('limit'),
            initial: formData.get('initial'),
            rollover: formData.get('rollover') === 'on',
            oldName: formData.get('old_name')
        });
        form.reset();
        document.getElementById('submitCategoryBtn').innerText = '添加预算类别';
        document.getElementById('submitCategoryBtn').classList.replace('btn-primary', 'btn-secondary');
        updateUI();
    } else if (form.id === 'addAssetCategoryForm') {
        const formData = new FormData(form);
        await window.financeAPI.addAssetCategory(formData.get('name'));
        form.reset();
        updateUI();
    }
});

// --- Button Clicks ---
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    if (btn.id === 'recordAssetBtn') {
        await window.financeAPI.recordAssetSnapshot();
        updateUI();
    } else if (btn.id === 'goToSettings') {
        window.location.href = 'settings.html';
    } else if (btn.id === 'backToDashboard') {
        window.location.href = 'index.html';
    }
});

// --- Charts ---
const updateAssetChart = () => {
    const ctx = document.getElementById('assetChart');
    if (!ctx) return;
    const labels = Object.keys(appData.assets);
    const values = Object.values(appData.assets);
    if (assetChartInstance) assetChartInstance.destroy();
    assetChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: values, backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#0dcaf0'], borderWidth: 0 }]
        },
        options: { responsive: true, cutout: '70%', plugins: { legend: { display: false } } }
    });
};

const updateHistoryChart = () => {
    const ctx = document.getElementById('historyChart');
    if (!ctx || !appData.history || appData.history.length === 0) return;
    
    const t_vals = appData.history.map(item => new Date(item.date.replace(' ', 'T')).getTime());
    const n = t_vals.length;
    let X_vals = [];
    
    if (n < 2) {
        X_vals = t_vals.slice();
    } else {
        const t0 = t_vals[0];
        const tn = t_vals[n - 1];
        const c = (tn - t0) / (n - 1);
        
        X_vals.push(t0);
        let currentX = t0;
        
        for (let i = 1; i < n; i++) {
            const dt = t_vals[i] - t_vals[i-1];
            const p_bar = tn === t0 ? 0 : ((t_vals[i] + t_vals[i-1]) / 2 - t0) / (tn - t0);
            
            // 非线性调整因子：距离当前越近 (p_bar -> 1)，权重 w 越大，越倾向于均匀分布 (c)
            // 距离当前越远 (p_bar -> 0)，权重 w 越小，越倾向于真实时间间距 (dt)
            const w = Math.pow(p_bar, 2); 
            const dX = (1 - w) * dt + w * c;
            
            currentX += dX;
            X_vals.push(currentX);
        }
        
        // 将虚拟坐标缩放回原始的时间跨度范围，以保持图表刻度合理
        const Xn = X_vals[n - 1];
        if (Xn !== t0) {
            for (let i = 1; i < n; i++) {
                X_vals[i] = t0 + (X_vals[i] - t0) * (tn - t0) / (Xn - t0);
            }
        }
    }
    
    const chartData = appData.history.map((item, i) => ({
        x: X_vals[i],
        y: item.total,
        originalDate: item.date,
        realTime: t_vals[i]
    }));
    
    if (historyChartInstance) historyChartInstance.destroy();
    
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const primaryColor = isDark ? '#fda085' : '#764ba2';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    
    historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: '总资产 (CNY)',
                data: chartData,
                borderColor: primaryColor,
                backgroundColor: primaryColor + '15',
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: primaryColor,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHitRadius: 20,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'nearest' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#2c2c2c' : '#fff',
                    titleColor: isDark ? '#fff' : '#2c3e50',
                    bodyColor: isDark ? '#eee' : '#2c3e50',
                    borderColor: primaryColor,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: (items) => `📅 ${items[0].raw.originalDate}`,
                        label: (context) => `💰 ¥ ${formatCurrency(context.raw.y)}`
                    }
                }
            },
            scales: {
                x: { 
                    type: 'linear',
                    min: n === 1 ? X_vals[0] - 86400000 : undefined, // 1 day padding
                    max: n === 1 ? X_vals[0] + 86400000 : undefined,
                    grid: { display: false },
                    ticks: { 
                        font: { size: 13, weight: '500' }, 
                        color: isDark ? '#aaa' : '#666', 
                        maxRotation: 0, 
                        autoSkip: true, 
                        maxTicksLimit: 10,
                        callback: function(value) {
                            if (n === 1 && value !== X_vals[0]) return '';
                            let realT = value;
                            if (n > 1 && value > X_vals[0] && value < X_vals[n-1]) {
                                for (let i = 1; i < n; i++) {
                                    if (value <= X_vals[i]) {
                                        const ratio = (value - X_vals[i-1]) / (X_vals[i] - X_vals[i-1]);
                                        realT = t_vals[i-1] + ratio * (t_vals[i] - t_vals[i-1]);
                                        break;
                                    }
                                }
                            } else if (value <= X_vals[0]) {
                                realT = t_vals[0];
                            } else if (value >= X_vals[n-1]) {
                                realT = t_vals[n-1];
                            }
                            
                            const d = new Date(realT);
                            return `${d.getMonth() + 1}-${d.getDate()}`;
                        }
                    } 
                },
                y: { 
                    grid: { color: gridColor },
                    ticks: { font: { size: 12 }, color: isDark ? '#aaa' : '#666', callback: (value) => '¥' + (value >= 10000 ? (value/10000).toFixed(1) + 'w' : value) } 
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const data = appData.history[index];
                    if (confirm(`确定要删除 ${data.date} 的记录 (¥${formatCurrency(data.total)}) 吗？`)) {
                        window.financeAPI.deleteHistoryPoint(index).then(() => updateUI());
                    }
                }
            }
        }
    });
};

// --- Theme & UI Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化猫咪 AI (CSS 交互增强版)
    const cat = document.getElementById('petCat');
    if (cat) {
        console.log('Interactive Cat: Ready');
        
        const generalMessages = [
            "喵~", "呼噜呼噜...", "资产在增长吗？", "今天也要记账喵", 
            "摸摸头~", "不要乱花钱喵", "喵呜！", "我在盯着你呢",
            "攒钱买小鱼干...", "我是财务小管家"
        ];

        const getTimeSensitiveMsg = () => {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 11) return ["早安喵~", "太阳晒屁股了喵", "又是新的一天喵！"];
            if (hour >= 11 && hour < 13) return ["中午好喵", "记得按时吃午饭喵", "午餐不要太奢侈喵~"];
            if (hour >= 13 && hour < 18) return ["下午好喵", "困了可以打个盹喵...", "来杯咖啡吗喵？"];
            if (hour >= 18 && hour < 23) return ["晚上好喵", "准备休息了吗喵？", "今天过得怎么样喵？"];
            return ["这么晚还不睡喵？", "熬夜对身体不好喵...", "月亮都睡了喵~"];
        };
        
        let isSpeaking = false;
        let lastInteractionTime = 0; // 初始为 0，防止刚开始就跟随鼠标

        // 眼睛跟踪逻辑
        document.addEventListener('mousemove', (e) => {
            if (cat.classList.contains('sleeping')) return;
            
            // 只有交互后的 30 秒内会看鼠标
            if (Date.now() - lastInteractionTime > 30000) {
                // 回到中心
                cat.style.setProperty('--pupil-x', '50%');
                cat.style.setProperty('--pupil-y', '50%');
                return;
            }

            const rect = cat.getBoundingClientRect();
            const catX = rect.left + rect.width / 2;
            const catY = rect.top + rect.height / 2;
            
            const angle = Math.atan2(e.clientY - catY, e.clientX - catX);
            const distance = Math.min(3, Math.hypot(e.clientX - catX, e.clientY - catY) / 100);
            
            const px = 50 + Math.cos(angle) * distance * 10;
            const py = 50 + Math.sin(angle) * distance * 10;
            
            cat.style.setProperty('--pupil-x', `${px}%`);
            cat.style.setProperty('--pupil-y', `${py}%`);
        });

        // 自动闲聊逻辑
        const autoChat = () => {
            if (!isSpeaking && !cat.classList.contains('sleeping')) {
                const timeMsgs = getTimeSensitiveMsg();
                const allPool = [...generalMessages, ...timeMsgs];
                const msg = allPool[Math.floor(Math.random() * allPool.length)];
                
                cat.style.setProperty('--cat-msg', `"${msg}"`);
                cat.classList.add('meowing');
                setTimeout(() => {
                    if (!isSpeaking) cat.classList.remove('meowing');
                }, 2500);
            }
            // 随机 15-45 秒闲聊一次
            setTimeout(autoChat, 15000 + Math.random() * 30000);
        };
        setTimeout(autoChat, 5000);

        // 交互逻辑
        cat.onclick = async (e) => {
            e.stopPropagation();
            lastInteractionTime = Date.now();

            if (cat.classList.contains('sleeping')) {
                cat.classList.remove('sleeping');
                const greetings = getTimeSensitiveMsg();
                const greeting = greetings[0]; // 优先用第一个问候语
                cat.style.setProperty('--cat-msg', `"${greeting}"`);
                cat.classList.add('meowing');
                setTimeout(() => cat.classList.remove('meowing'), 2500);
                return;
            }

            if (isSpeaking) return;
            isSpeaking = true;
            
            const timeMsgs = getTimeSensitiveMsg();
            const allPool = [...generalMessages, ...timeMsgs];
            const fullMsg = allPool[Math.floor(Math.random() * allPool.length)];
            
            const chunkSize = 8;
            for (let i = 0; i < fullMsg.length; i += chunkSize) {
                cat.style.setProperty('--cat-msg', `"${fullMsg.slice(i, i + chunkSize)}"`);
                cat.classList.add('meowing');
                await new Promise(r => setTimeout(r, 1600));
                cat.classList.remove('meowing');
                await new Promise(r => setTimeout(r, 200));
            }
            isSpeaking = false;
        };

        // 自动入睡逻辑
        setInterval(() => {
            if (!cat.classList.contains('sleeping') && Date.now() - lastInteractionTime > 60000) {
                cat.classList.add('sleeping');
            }
        }, 10000);
    }

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('budget_tracker_theme', theme);
        const isDark = theme === 'dark';
        const icon = document.getElementById('themeIcon');
        const text = document.getElementById('themeText');
        if (icon) icon.textContent = isDark ? '☀️' : '🌙';
        if (text) text.textContent = isDark ? '浅色模式' : '暗色模式';
        
        // 同步通知后端修改原生窗口的顶栏颜色
        if (window.financeAPI && window.financeAPI.setTheme) {
            window.financeAPI.setTheme(theme);
        }

        if (appData) {
            updateAssetChart();
            updateHistoryChart();
        }
    };
    
    const savedTheme = localStorage.getItem('budget_tracker_theme') || 'light';
    applyTheme(savedTheme);
    
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.onclick = () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        };
    }
    
    updateUI();
});
