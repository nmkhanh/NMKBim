@echo off
chcp 65001 >nul
title Cài đặt NMKBim Revit Add-in
echo Đang tiến hành cài đặt add-in NMKBim cho Revit...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
pause
