@echo off
cd /d "%~dp0"
node "gunshtml\build-weapon-catalog.js"
node "maps\build-harvest-forge-map.js"
start "" "http://127.0.0.1:8787/forge_3_1.html"
py -m http.server 8787 --bind 127.0.0.1
if errorlevel 1 python -m http.server 8787 --bind 127.0.0.1
