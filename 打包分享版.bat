@echo off
chcp 65001 >nul
title CHRISTMAS FROM YUAN - 打包分享版
cd /d "%~dp0"

echo.
echo ====================================================
echo   正在重新打包最新修改版本 (dist 文件夹)...
echo ====================================================
echo.

if not exist "node_modules" (
  echo 正在自动安装依赖...
  call npm install
)

call npm run build
if errorlevel 1 (
  echo.
  echo [错误] 打包失败，请检查上方报错信息。
  pause
  exit /b 1
)

echo.
echo [完成] 打包成功！已自动为你打开 dist 文件夹。
echo        可直接将 dist 整个文件夹拖到 https://app.netlify.com/drop 生成分享链接。
echo.
explorer "%~dp0dist"
pause
