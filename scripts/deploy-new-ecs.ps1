param(
  [string]$SshUser = "root",
  [string]$HostName = "47.112.10.126",
  [string]$RemoteDir = "/opt/digital-commerce-practicum",
  [string]$Pm2Name = "digital-commerce-practicum",
  [switch]$SkipLocalChecks
)

$ErrorActionPreference = "Stop"

if ($HostName -eq "112.124.63.206") {
  throw "Refusing to deploy to old ECS 112.124.63.206. Use 47.112.10.126."
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

foreach ($required in @("package.json", "package-lock.json", "nuxt.config.ts", "tsconfig.json", "app.vue")) {
  if (-not (Test-Path $required)) {
    throw "Missing required project file: $required"
  }
}

if (-not $SkipLocalChecks) {
  Write-Host "[1/6] Running local typecheck..."
  npm.cmd run typecheck
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "digital-commerce-practicum-$stamp.tar.gz"
$archivePath = Join-Path $env:TEMP $archiveName

if (Test-Path $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

Write-Host "[2/6] Creating deployment archive..."
tar.exe `
  --exclude="./.data" `
  --exclude="./.data-e2e" `
  --exclude="./.worktrees" `
  --exclude="./node_modules" `
  --exclude="./.nuxt" `
  --exclude="./.output" `
  --exclude="./test-results" `
  --exclude="./playwright-report" `
  --exclude="./.playwright-cli" `
  --exclude="./output" `
  --exclude="./*.zip" `
  -czf $archivePath .

$remote = "$SshUser@$HostName"
$remoteArchive = "/tmp/$archiveName"

Write-Host "[3/6] Uploading archive to $remote..."
scp.exe $archivePath "${remote}:$remoteArchive"

$remoteCommand = @"
set -e
if [ "$RemoteDir" = "/" ] || [ -z "$RemoteDir" ]; then
  echo "Refusing unsafe RemoteDir: $RemoteDir" >&2
  exit 1
fi
mkdir -p "$RemoteDir"
cd "$RemoteDir"
tar -xzf "$remoteArchive"
rm -f "$remoteArchive"
test -f package.json
test -f nuxt.config.ts
test -f tsconfig.json
npm install
npm run build
pm2 restart "$Pm2Name"
pm2 save
"@

Write-Host "[4/6] Installing, building, and restarting PM2 on server..."
ssh.exe $remote $remoteCommand

Write-Host "[5/6] Checking deployed URL..."
$url = "http://$HostName:3000/practicum"
$response = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 20
if ($response.StatusCode -ne 200) {
  throw "Deployment finished, but $url returned HTTP $($response.StatusCode)."
}

Write-Host "[6/6] Done. $url returned HTTP 200."
Write-Host "Deployment target: $remote:$RemoteDir"
