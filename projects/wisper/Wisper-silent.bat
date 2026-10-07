@echo off
rem Launch Wisper in the background (no console window). Lives in the system tray.
cd /d "%~dp0"
start "" ".venv\Scripts\pythonw.exe" -m wisper
