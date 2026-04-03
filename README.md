# 💸 个人预算与资产看板 (Personal Finance & Asset Tracker)

一个基于 Python Flask 的轻量级个人财务追踪 Web 应用。通过本地运行的后端服务，将您的资产与开销数据持久化存储于本地 JSON 文件中，无需注册账号、无需联网、无数据上传风险。

---

## ✨ 核心功能

| 功能 | 描述 |
|------|------|
| 📊 资产追踪 | 支持股票、加密货币、银行存款、基金等多类别资产的金额录入与汇总 |
| 🎯 目标进度 | 设置财务目标（默认 500 万），实时显示当前总资产占目标的完成进度 |
| 🛒 开销记录 | 快速添加日常消费账单（金额 + 描述），自动记录时间，保留最近 50 条 |
| 💾 本地持久化 | 所有数据以 JSON 格式存储于本地文件 `data.json`，重启服务后数据不丢失 |
| 🔒 完全离线 | 应用完全运行在您自己的设备上，无任何数据上传至云端 |

---

## 🛠️ 运行条件 (Requirements)

- **操作系统**：Windows 10/11 或任意主流 Linux 发行版（Ubuntu、Debian、CentOS 等）
- **Python**：Python 3.7 或更高版本（需已添加到系统 PATH）
- **依赖库**：Flask（见下方安装步骤）
- **浏览器**：Chrome、Edge、Firefox、Safari 等现代浏览器

---

## 🚀 安装与运行步骤

### 方法一：直接运行 Flask（推荐开发/日常使用）

**第一步：安装依赖**

```bash
pip install flask
```

**第二步：启动应用**

```bash
python app.py
```

**第三步：在浏览器中访问**

```
http://localhost:5000
```

> 首次运行时，程序会自动在当前目录创建 `data.json` 文件用于存储数据。

---

### 方法二：作为系统后台服务运行（适合长期挂载）

通过提供的自动化脚本，可将应用注册为系统后台守护进程，实现**开机自启动**，随时通过浏览器访问 `http://localhost:5000`。

> **注意**：以下脚本使用 Python 内置的 `http.server` 模块以静态模式运行，适合将 `index.html` 作为纯前端独立部署的场景。若需完整的 Flask 后端功能（数据持久化到 `data.json`），请使用方法一手动启动。

#### 🐧 Linux 系统（Systemd）

1. 将项目文件放在同一目录中，打开终端进入该目录

2. 赋予脚本执行权限：
   ```bash
   chmod +x install_linux.sh uninstall_linux.sh
   ```

3. 以 root 权限运行安装脚本：
   ```bash
   sudo ./install_linux.sh
   ```

4. 安装成功后，在浏览器访问 `http://localhost:5000`

5. 常用服务管理命令：
   ```bash
   sudo systemctl status finance-tracker.service   # 查看状态
   sudo systemctl stop finance-tracker.service     # 停止服务
   sudo systemctl restart finance-tracker.service  # 重启服务
   ```

6. 如需卸载服务：
   ```bash
   sudo ./uninstall_linux.sh
   ```

#### 🪟 Windows 系统（计划任务）

1. 将项目文件放在同一目录中

2. 右键点击"开始"按钮，选择 **"终端 (管理员)"** 或 **"Windows PowerShell (管理员)"**

3. 进入项目目录：
   ```powershell
   cd C:\路径\到\您的\文件夹
   ```

4. 若系统限制脚本执行，先运行：
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

5. 运行安装脚本：
   ```powershell
   .\install_windows.psl
   ```

6. 安装成功后，在浏览器访问 `http://localhost:5000`

7. 如需卸载服务：
   ```powershell
   .\uninstall_windows.psl
   ```

---

## 📂 项目结构

```
finance/
│
├── app.py                # Flask 后端主程序（路由、数据读写逻辑）
├── templates/
│   └── index.html        # 前端页面模板（UI、图表、表单）
├── data.json             # 运行后自动生成，存储所有财务数据
├── install_linux.sh      # Linux 服务安装脚本（Systemd）
├── uninstall_linux.sh    # Linux 服务卸载脚本
├── install_windows.psl   # Windows 服务安装脚本（计划任务）
├── uninstall_windows.psl # Windows 服务卸载脚本
└── README.md             # 项目说明文档
```

---

## 🔌 API 路由说明

| 路由 | 方法 | 功能 |
|------|------|------|
| `/` | GET | 主页，展示资产总览与开销列表 |
| `/update_assets` | POST | 更新各类别资产金额 |
| `/add_expense` | POST | 添加一条新的开销记录 |

---

## ⚠️ 注意事项

- **数据文件**：`data.json` 是所有数据的唯一存储来源，请妥善保管，不要手动删除。
- **备份建议**：如需迁移到其他设备，只需复制 `data.json` 文件即可保留全部历史数据。
- **开销条数**：系统自动只保留最近 **50 条**开销记录，超出部分会被自动丢弃，请定期手动导出备份。
- **端口占用**：默认使用 `5000` 端口，如有冲突，可修改 `app.py` 末尾的 `port=5000` 参数。
