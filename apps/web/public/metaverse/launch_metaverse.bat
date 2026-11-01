@echo off
echo.
echo ========================================
echo    🎮 METAVERSE HUB - LAUNCH SCRIPT
echo ========================================
echo.
echo Starting Metaverse Hub with all features...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found! Please install Python first.
    echo.
    pause
    exit /b 1
)

REM Start the server
echo 🚀 Starting HTTP server on port 8000...
start /min python -m http.server 8000

REM Wait a moment for server to start
echo ⏳ Waiting for server to initialize...
timeout /t 3 /nobreak >nul

REM Open the main application
echo 🎮 Opening Metaverse Hub...
start http://localhost:8000/index.html

echo.
echo ✅ Metaverse Hub is now running!
echo.
echo 📱 Access Points:
echo    • Main App: http://localhost:8000/index.html
echo    • Verification: http://localhost:8000/verify.html
echo.
echo 🎮 Features Available:
echo    • Human-like anime avatars
echo    • First-person gaming controls
echo    • Audio output for character voices
echo    • Walking and running animations
echo    • Interactive 3D environment
echo    • Gamification with points and unlocks
echo.
echo Press any key to exit...
pause >nul
