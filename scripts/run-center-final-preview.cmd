@echo off
cd /d "%~dp0.."
set NITRO_PORT=3003
node .output-center-final\server\index.mjs >> output\playwright\center-final-preview.stdout.log 2>> output\playwright\center-final-preview.stderr.log
