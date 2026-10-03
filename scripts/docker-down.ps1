$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    docker compose --env-file $envFile down
} else {
    docker compose down
}
