@echo off
cd /d "%~dp0"
echo Markt-Terminal startet ... Fenster offen lassen, solange der Stream laeuft.
node server.mjs
pause
