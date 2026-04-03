#!/bin/bash

# ==============================================================================
# 财务看板应用 - Linux Systemd 服务安装脚本
# ==============================================================================

# 确保以 root 权限运行
if [ "$EUID" -ne 0 ]; then
  echo "错误: 请使用 sudo 运行此脚本 (例如: sudo ./install.sh)"
  exit 1
fi

# 检查是否安装了 Python 3
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 python3，请先安装 Python 3。"
    exit 1
fi

# 获取当前应用所在的绝对路径
APP_DIR=$(pwd)
SERVICE_NAME="finance-tracker.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME"

# 确定运行服务的非 root 用户 (获取调用 sudo 的原始用户)
RUN_USER=${SUDO_USER:-$(whoami)}

echo "正在将 $APP_DIR 注册为系统服务..."

# 创建 Systemd 单元文件
cat <<EOF > $SERVICE_PATH
[Unit]
Description=Finance Tracker Web Service
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
# 使用 Python 3 内置的 http.server 在后台运行服务，端口 5000
ExecStart=$(which python3) -m http.server 5000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 重新加载 systemd 配置，启用开机自启并立刻启动服务
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl start $SERVICE_NAME

echo "================================================================"
echo "✅ 安装成功！"
echo "应用已作为系统守护进程在后台运行，并已设置开机自启动。"
echo "请在浏览器中访问: http://localhost:5000"
echo "查看服务状态命令: sudo systemctl status $SERVICE_NAME"
echo "================================================================"