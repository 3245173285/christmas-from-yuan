@echo off
chcp 65001 >nul
cd /d "%~dp0worker"
echo ========================================================
echo   CHRISTMAS FROM YUAN - Cloudflare 云端贺卡后端一键部署
echo ========================================================
echo.
echo [1/3] 正在打开浏览器登录你的 Cloudflare 账号...
call npx wrangler login
if errorlevel 1 (
  echo 登录取消或失败，请重试。
  pause
  exit /b 1
)
echo.
echo [2/3] 请确认 worker\wrangler.jsonc 中已填入你的 KV namespace id，
echo       如尚未创建 KV，请运行: npx wrangler kv namespace create CARDS_KV
echo.
echo [3/3] 正在部署云端贺卡 Worker...
call npx wrangler deploy
echo.
echo 部署完成后，将上方打印出的 https://christmas-from-yuan-cards.xxx.workers.dev
echo 填入 src\config\cardsApi.js 中的 WISH_CARDS_API_URL 并推送 GitHub 即可！
pause
