@echo off
cd /d "%~dp0.."
set NUXT_IGNORE_LOCK=1
npm.cmd run dev:direct -- --port 3002 --host 127.0.0.1
