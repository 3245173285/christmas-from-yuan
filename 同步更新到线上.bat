@echo off
chcp 65001 >nul
title CHRISTMAS FROM YUAN - 同步更新到线上链接
cd /d "%~dp0"

echo.
echo ====================================================
echo   正在将最新代码同步到 GitHub (线上链接将自动更新)
echo ====================================================
echo.

git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Update Christmas from Yuan"
) else (
  echo [提示] 没有新的未提交改动，将直接推送已有提交到 GitHub...
)

echo [推送] 如首次使用弹出 GitHub 授权窗口，点击 Sign in with your browser 即可。
echo.
git push -u origin main

if errorlevel 1 (
  echo.
  echo [错误] 推送失败，请检查网络或 GitHub 账号授权。
  pause
  exit /b 1
)

echo.
echo [成功] 已推送到 GitHub！
echo        绑定 Cloudflare Pages / Vercel 后，约 20~40 秒线上手机链接会自动更新。
echo.
pause
