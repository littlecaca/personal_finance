<#
.SYNOPSIS
Finance Tracker - Windows Scheduled Task Service Installation Script

.DESCRIPTION
This script uses Windows Task Scheduler to register the application as an implicit background service,
and automatically runs the Flask application at system startup.
#>

# Ensure running with administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Error: Please run PowerShell as administrator and execute this script again." -ForegroundColor Red
    Pause
    Exit
}

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
} catch {
    Write-Host "Error: python not found in environment variables, please ensure Python is installed and added to PATH." -ForegroundColor Red
    Pause
    Exit
}

# Install Flask dependency
Write-Host "Installing Flask dependency..." -ForegroundColor Cyan
python -m pip install flask --quiet

$AppDir = Get-Location
$TaskName = "FinanceTrackerService"

Write-Host "Registering background service (Scheduled Task)..." -ForegroundColor Cyan

# Set to run Flask application hidden at startup
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -Command `"cd '$AppDir'; python app.py`""
# Set trigger: Run at system startup (auto-start)
$Trigger = New-ScheduledTaskTrigger -AtStartup
# Set run level to highest and allow run on demand
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Register and overwrite task with same name
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Force | Out-Null

# Start task immediately
Start-ScheduledTask -TaskName $TaskName

Write-Host "================================================================" -ForegroundColor Green
Write-Host "✅ Installation successful!" -ForegroundColor Green
Write-Host "The application is now running as a background task and will start automatically at system startup." -ForegroundColor Green
Write-Host "You can now visit in your browser: http://localhost:5000" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Pause
