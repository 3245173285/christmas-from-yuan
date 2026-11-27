@echo off
chcp 65001 >nul
title CHRISTMAS FROM YUAN - 同步更新到线上链接
cd /d "%~dp0"

echo.
echo ====================================================
echo   正在将最新修改同步到 GitHub (线上链接将自动更新)
echo ====================================================
echo.

git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo [提示] 当前没有检测到新的修改，无需重复上传。
  pause
  exit /b 0
)

set "MSG=Update Christmas from Yuan"
git commit -m "%MSG%"
git push origin main

if errorlevel 1 (
  echo.
  echo [错误] 推送失败，请检查网络或 GitHub 登录状态。
  pause
  exit /b 1
)

echo.
echo [成功] 已推送到 GitHub！约 20~40 秒后，手机上的线上链接会自动更新为最新版本。
echo.
pause
