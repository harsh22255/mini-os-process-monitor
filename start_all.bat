@echo off
title MINI OS PROCESS MONITOR - SYSTEM LAUNCHER
color 0b
echo ==============================================================================
echo              FUTURISTIC 3D MINI OS PROCESS MONITOR
echo              MONITOR. VISUALIZE. CONTROL. EXPERIENCE.
echo ==============================================================================
echo.
echo [1/3] Starting C++ Core Simulation Engine on http://127.0.0.1:8080 ...
start "Mini OS C++ Backend" cmd /k ".\backend\build\mini_os_backend.exe 8080"
timeout /t 2 /nobreak >nul

echo [2/3] Starting Futuristic 3D React Dashboard on http://localhost:5173 ...
cd frontend
start "Mini OS 3D Frontend" cmd /k "npm run dev"
cd ..
timeout /t 3 /nobreak >nul

echo [3/3] Opening Futuristic Command Center in your default browser...
start http://localhost:5173

echo.
echo ==============================================================================
echo  SYSTEM LAUNCHED SUCCESSFULLY!
echo  - Frontend: http://localhost:5173
echo  - Backend API: http://127.0.0.1:8080/api/health
echo  - WebSocket Stream: ws://127.0.0.1:8080/ws
echo ==============================================================================
echo.
pause
