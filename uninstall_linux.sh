#!/bin/bash

# ==============================================================================
# 财务看板应用 - Linux Systemd 服务卸载脚本
# ==============================================================================

# 确保以 root 权限运行
if [ "$EUID" -ne 0 ]; then
  echo "错误: 请使用 sudo 运行此脚本 (例如: sudo ./uninstall.sh)"
  exit 1
fi

SERVICE_NAME="finance-tracker.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME"

echo "正在停止并移除服务..."

# 停止并禁用服务
systemctl stop $SERVICE_NAME 2>/dev/null
systemctl disable $SERVICE_NAME 2>/dev/null

# 删除单元文件
if [ -f "$SERVICE_PATH" ]; then
    rm "$SERVICE_PATH"
    echo "已删除服务文件: $SERVICE_PATH"
fi

# 重新加载 systemd 配置
systemctl daemon-reload

echo "✅ 卸载成功！后台服务已停止且不再开机自启。"