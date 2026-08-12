@echo off
:: Start LearnEC Practicum Server
:: Clears stale DATABASE_URL from environment to prevent .env override

echo === LearnEC Practicum Server ===

:: Unset shell-level DATABASE_URL so .env takes precedence
set DATABASE_URL=

:: Start from project directory
cd /d "C:\Users\29053\Desktop\智能体\数字商贸实训工作台"

:: Ensure PostgreSQL is running
docker start digital-commerce-practicum-postgres >nul 2>&1
echo PostgreSQL: OK

:: Start production server
set NITRO_HOST=127.0.0.1
set NITRO_PORT=4310
set PORT=4310
echo Starting server on http://127.0.0.1:4310 ...
node --env-file=.env .output\server\index.mjs
