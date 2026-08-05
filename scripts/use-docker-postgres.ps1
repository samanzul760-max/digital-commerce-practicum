param(
  [switch]$StatusOnly,
  [switch]$RunE2E
)

$ErrorActionPreference = 'Stop'
$composeFile = Join-Path $PSScriptRoot '..\docker-compose.yml'
$container = 'digital-commerce-practicum-postgres'
$port = 55432

function Test-PgPort {
  $conn = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue
  return $conn.TcpTestSucceeded
}

if ($StatusOnly) {
  $state = docker inspect -f '{{.State.Status}} {{.State.Health.Status}}' $container 2>$null
  if (-not $state) {
    Write-Output "container not found"
    exit 1
  }
  Write-Output $state
  exit 0
}

if (-not (Test-PgPort)) {
  Write-Output "starting Docker PostgreSQL via $composeFile"
  docker compose -f $composeFile up -d 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Output "docker compose up failed with exit code $LASTEXITCODE"
    exit 1
  }
  $deadline = (Get-Date).AddMinutes(2)
  while ((Get-Date) -lt $deadline) {
    if (Test-PgPort) { break }
    Start-Sleep -Seconds 2
  }
  if (-not (Test-PgPort)) {
    Write-Output "PostgreSQL did not become reachable on port $port"
    exit 1
  }
}

$state = docker inspect -f '{{.State.Status}} {{.State.Health.Status}}' $container 2>$null
Write-Output "Docker PostgreSQL $state at 127.0.0.1:$port"

if ($RunE2E) {
  & npm.cmd run test:e2e
  exit $LASTEXITCODE
}
