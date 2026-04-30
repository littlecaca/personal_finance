<#
.SYNOPSIS
财务看板应用 - Windows 计划任务服务安装脚本 (增强版)

.DESCRIPTION
此脚本会使用 Windows 计划任务将该应用注册为隐式后台服务。
配置了增强的开机自启属性，确保在电池模式下也能正常运行。
#>

# 确保以管理员权限运行
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "错误: 请以管理员身份运行 PowerShell，然后再次执行此脚本。" -ForegroundColor Red
    Pause
    Exit
}

# 检查 Python 是否可用
try {
    $pythonVersion = python --version 2>&1
} catch {
    Write-Host "错误: 未在环境变量中找到 python，请确保已安装 Python 并添加到了 PATH。" -ForegroundColor Red
    Pause
    Exit
}

$AppDir = Get-Location
$TaskName = "FinanceTrackerService"

Write-Host "正在注册后台服务（开机自启计划任务）..." -ForegroundColor Cyan

# 1. 定义操作：后台运行 Python HTTP Server
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -Command `"cd '$AppDir'; python app.py`""

# 2. 定义触发器：AtStartup (系统启动时，无需登录)
$Trigger = New-ScheduledTaskTrigger -AtStartup

# 3. 定义运行账户：使用 SYSTEM 账户可以在用户未登录时就启动服务
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# 4. 关键设置：增强开机自启可靠性
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Days 0) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

# 5. 注册并覆盖任务
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null

# 立即启动任务进行测试
Start-ScheduledTask -TaskName $TaskName

Write-Host "================================================================" -ForegroundColor Green
Write-Host "? 安装成功！" -ForegroundColor Green
Write-Host "关键配置已完成：" -ForegroundColor White
Write-Host " - 触发器：系统启动时 (AtStartup)" -ForegroundColor White
Write-Host " - 运行账户：SYSTEM (无需登录即可运行)" -ForegroundColor White
Write-Host " - 电源管理：允许电池模式下运行" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Green
Write-Host "您现在可以在浏览器中访问: http://localhost:5000" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Pause