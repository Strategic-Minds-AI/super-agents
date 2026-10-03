$ErrorActionPreference = "Stop"

docker version | Out-Null

$envFile = Join-Path $PSScriptRoot "..\.env"
$template = Join-Path $PSScriptRoot "..\.env.example"

if (-not (Test-Path $envFile)) {
    Copy-Item $template $envFile
    $content = Get-Content $envFile -Raw
    $pg = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
    $token = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
    $content = $content.Replace("replace-with-a-long-random-value", $pg)
    $firstIndex = $content.IndexOf("RUNTIME_TOKEN=$pg")
    if ($firstIndex -ge 0) {
        $content = $content.Remove($firstIndex, ("RUNTIME_TOKEN=$pg").Length).Insert($firstIndex, "RUNTIME_TOKEN=$token")
    }
    Set-Content -Path $envFile -Value $content -NoNewline
    Write-Host "Created .env with local database/runtime credentials."
    Write-Host "Add OPENAI_API_KEY to .env before running model-backed tasks."
}

docker compose --env-file $envFile up -d --build
docker compose --env-file $envFile ps
