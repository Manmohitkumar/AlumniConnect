@echo off
echo Starting Metaverse Hub...
echo.
echo Waiting 3 seconds before opening main application...
timeout /t 3 /nobreak > nul
echo.
echo Opening main Metaverse Hub application...
start http://localhost:8000/index.html
echo.
echo Metaverse Hub is now running!
echo.
echo If you see any errors, please check the browser console (F12)
echo.
pause
