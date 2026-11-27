@echo off
chcp 65001 >nul
title CHRISTMAS FROM YUAN - 启动中...
cd /d "%~dp0"

echo.
echo ====================================================
echo   CHRISTMAS FROM YUAN — 北欧极光圣诞之境
echo ====================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [提示] 未检测到 Node.js，请先安装 Node.js (https://nodejs.org/)
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/2] 首次运行，正在自动安装依赖，请稍候...
  call npm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络连接后重试。
    pause
    exit /b 1
  )
)

echo [启动] 正在启动本地服务并自动打开浏览器...
echo [说明] 修改代码或贺卡文案 (src\data\giftCards.js) 保存后页面会自动实时更新。
echo [提示] 浏览时请保持此窗口开启，关闭本窗口即可停止服务。
echo.

call npx vite --port 5173 --host --open
pause
