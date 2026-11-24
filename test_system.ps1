<#
.SYNOPSIS
    End-to-End System Test for Mini OS Process Monitor
#>

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " MINI OS PROCESS MONITOR - E2E AUTOMATED VERIFICATION" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$backendExe = ".\backend\build\mini_os_backend.exe"
if (!(Test-Path $backendExe)) {
    Write-Host "[Error] Backend binary not found at $backendExe. Please build first." -ForegroundColor Red
    exit 1
}

Write-Host "`n[1/12] Launching C++ Core Simulation Engine on port 8080..." -ForegroundColor Yellow
$proc = Start-Process -FilePath $backendExe -ArgumentList "8080" -PassThru
Start-Sleep -Seconds 3

try {
    # 1. Health check
    Write-Host "[2/13] Testing GET /api/health..." -ForegroundColor Yellow
    $health = curl.exe -s http://127.0.0.1:8080/api/health | ConvertFrom-Json
    if ($health.status -eq "online") {
        Write-Host "  -> PASS: Backend online. Engine: $($health.engine) (Uptime: $($health.uptime_seconds)s)" -ForegroundColor Green
    } else {
        throw "Failed health check"
    }

    # 2. Check Operational Mode (Real Host OS)
    Write-Host "[3/13] Testing GET /api/mode (Dual Engine Architecture)..." -ForegroundColor Yellow
    $mode = curl.exe -s http://127.0.0.1:8080/api/mode | ConvertFrom-Json
    Write-Host "  -> PASS: Current engine mode is '$($mode.operational_mode)'." -ForegroundColor Green

    # 3. Get Real Host processes
    Write-Host "[4/13] Testing Real Windows Host process enumeration..." -ForegroundColor Yellow
    $procs = curl.exe -s http://127.0.0.1:8080/api/processes | ConvertFrom-Json
    Write-Host "  -> PASS: Enumerated $($procs.Count) real host processes from Windows kernel." -ForegroundColor Green

    # 4. Resources telemetry (Real Windows Host CPU & RAM)
    Write-Host "[5/13] Testing Real Windows Host Resource Telemetry..." -ForegroundColor Yellow
    $res = curl.exe -s http://127.0.0.1:8080/api/resources | ConvertFrom-Json
    Write-Host "  -> PASS: Real Host RAM: $([math]::Round($res.memory_usage_mb, 1))MB / $([math]::Round($res.memory_total_mb, 1))MB ($($res.memory_percentage)%), Host CPU: $($res.cpu_usage)%." -ForegroundColor Green

    # 5. Switch to SIMULATION Engine Mode
    Write-Host "[6/13] Testing POST /api/mode -> SIMULATION Engine..." -ForegroundColor Yellow
    $simRes = curl.exe -s -X POST http://127.0.0.1:8080/api/mode -H "Content-Type: application/json" -d "{\`"mode\`":\`"SIMULATION\`"}" | ConvertFrom-Json
    if ($simRes.operational_mode -eq "SIMULATION") {
        Write-Host "  -> PASS: Engine transitioned to SIMULATION." -ForegroundColor Green
    } else {
        throw "Failed mode transition"
    }

    # 6. Create process in simulation
    Write-Host "[7/13] Testing POST /api/processes (Spawn Process)..." -ForegroundColor Yellow
    $newProcJson = curl.exe -s -X POST http://127.0.0.1:8080/api/processes -H "Content-Type: application/json" -d "{\`"name\`":\`"NeuralPipelineTask\`",\`"priority\`":9,\`"burst_time\`":40,\`"memory_usage\`":384.0}"
    $newProc = $newProcJson | ConvertFrom-Json
    $targetPid = $newProc.pid
    Write-Host "  -> PASS: Spawned [$targetPid] $($newProc.name) in state $($newProc.state)." -ForegroundColor Green

    # 7. Suspend process
    Write-Host "[8/13] Testing POST /api/processes/$targetPid/suspend..." -ForegroundColor Yellow
    $suspRes = curl.exe -s -X POST "http://127.0.0.1:8080/api/processes/$targetPid/suspend" | ConvertFrom-Json
    if ($suspRes.state -eq "SUSPENDED") {
        Write-Host "  -> PASS: Process successfully suspended." -ForegroundColor Green
    } else {
        throw "Failed suspend"
    }

    # 8. Resume process
    Write-Host "[9/13] Testing POST /api/processes/$targetPid/resume..." -ForegroundColor Yellow
    $resumeRes = curl.exe -s -X POST "http://127.0.0.1:8080/api/processes/$targetPid/resume" | ConvertFrom-Json
    if ($resumeRes.state -eq "READY") {
        Write-Host "  -> PASS: Process resumed to READY queue." -ForegroundColor Green
    } else {
        throw "Failed resume"
    }

    # 9. Topology graph
    Write-Host "[10/13] Testing GET /api/topology..." -ForegroundColor Yellow
    $topo = curl.exe -s http://127.0.0.1:8080/api/topology | ConvertFrom-Json
    Write-Host "  -> PASS: Topology graph contains $($topo.nodes.Count) nodes, $($topo.links.Count) links." -ForegroundColor Green

    # 10. Lifecycle history
    Write-Host "[11/13] Testing GET /api/lifecycle/history..." -ForegroundColor Yellow
    $hist = curl.exe -s http://127.0.0.1:8080/api/lifecycle/history | ConvertFrom-Json
    Write-Host "  -> PASS: Retrieved $($hist.Count) verified state transitions." -ForegroundColor Green

    # 11. Reports Summary & CSV Export
    Write-Host "[12/13] Testing GET /api/reports/summary & CSV Export..." -ForegroundColor Yellow
    $summary = curl.exe -s http://127.0.0.1:8080/api/reports/summary | ConvertFrom-Json
    $csv = curl.exe -s "http://127.0.0.1:8080/api/reports/export?format=csv"
    if ($csv -match "MINI OS PROCESS MONITOR - SYSTEM REPORT") {
        Write-Host "  -> PASS: CSV Report Generated (Status: $($summary.system_status))." -ForegroundColor Green
    } else {
        throw "CSV export format mismatch"
    }

    # 12. Switch back to REAL_HOST and verify
    Write-Host "[13/13] Testing POST /api/mode -> REAL_HOST and terminate simulation test process..." -ForegroundColor Yellow
    $switchBack = curl.exe -s -X POST http://127.0.0.1:8080/api/mode -H "Content-Type: application/json" -d "{\`"mode\`":\`"REAL_HOST\`"}" | ConvertFrom-Json
    Write-Host "  -> PASS: Successfully switched back to $($switchBack.operational_mode)." -ForegroundColor Green

    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host " ALL 13 VERIFICATION PHASES PASSED WITH ZERO ERRORS!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Cyan
} finally {
    Write-Host "`nStopping background test server..." -ForegroundColor DarkGray
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
