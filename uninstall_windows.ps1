<#
.SYNOPSIS
Finance Tracker - Windows Scheduled Task Service Uninstallation Script
#>

# Ensure running with administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Error: Please run PowerShell as administrator and execute this script again." -ForegroundColor Red
    Pause
    Exit
}

$TaskName = "FinanceTrackerService"

Write-Host "Stopping and removing background service..." -ForegroundColor Cyan

# Try to stop running task
try {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
} catch {}

# Unregister (delete) scheduled task
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
    Write-Host "✅ Uninstallation successful! Background service removed." -ForegroundColor Green
} catch {
    Write-Host "Service named $TaskName not found or already uninstalled." -ForegroundColor Yellow
}

Pause
