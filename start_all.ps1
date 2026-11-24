# Mini OS Process Monitor Launcher
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "              FUTURISTIC 3D MINI OS PROCESS MONITOR" -ForegroundColor Cyan
Write-Host "              MONITOR. VISUALIZE. CONTROL. EXPERIENCE." -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

$backendExe = ".\backend\build\mini_os_backend.exe"
if (!(Test-Path $backendExe)) {
    Write-Host "[Info] Compiling C++ backend executable..." -ForegroundColor Yellow
    $cmake = ".\tools\cmake-4.5.1-windows-x86_64\bin\cmake.exe"
    & $cmake --build ".\backend\build" -j4
}

Write-Host "`n[1/3] Starting C++ Core Simulation Engine on http://127.0.0.1:8080..." -ForegroundColor Yellow
$backendProc = Start-Process -FilePath $backendExe -ArgumentList "8080" -PassThru
Start-Sleep -Seconds 2

Write-Host "[2/3] Starting Futuristic 3D React Dashboard on http://localhost:5173..." -ForegroundColor Yellow
$frontendProc = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "frontend" -PassThru
Start-Sleep -Seconds 3

Write-Host "[3/3] Opening Futuristic Command Center in your default browser..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host "  SYSTEM LAUNCHED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "  - Frontend URL:   http://localhost:5173" -ForegroundColor Green
Write-Host "  - Backend API:    http://127.0.0.1:8080/api/health" -ForegroundColor Green
Write-Host "  - WebSocket:      ws://127.0.0.1:8080/ws" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "`nPress Ctrl+C or close the spawned windows to stop the servers."
