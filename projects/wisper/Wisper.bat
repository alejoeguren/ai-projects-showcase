@echo off
rem Launch Wisper with a console window (shows logs — good for debugging).
cd /d "%~dp0"
".venv\Scripts\python.exe" -m wisper
pause
