@echo off
REM Script per deploy rapido su Windows

echo 📝 Preparazione commit...
git add .

echo.
set /p commit_message="💬 Inserisci il messaggio di commit: "

git commit -m "%commit_message%"

echo.
echo 🚀 Push su GitHub...
git push origin main

echo.
echo ✅ Push completato! 
echo.
echo 🔗 Repository: https://github.com/Giusdeveloper/bilanci_dashboard
echo.
echo 📌 Prossimi passi:
echo 1. Vai su Replit
echo 2. Tools → Git → Pull from GitHub
echo 3. Clicca Deploy
echo.
pause
