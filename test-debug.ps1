$envFile = '.env.local'
$adminUser = (Get-Content $envFile | Where-Object { $_ -match '^ADMIN_USERNAME=' } | Select-Object -First 1) -replace '^ADMIN_USERNAME=',''
$adminPass = (Get-Content $envFile | Where-Object { $_ -match '^ADMIN_PASSWORD=' } | Select-Object -First 1) -replace '^ADMIN_PASSWORD=',''
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ usuario = $adminUser; senha = $adminPass } | ConvertTo-Json

# Login
Invoke-WebRequest -Uri 'https://sistema-fazer-ias-2026-online-4tdj7uqd5.vercel.app/api/login' -Method POST -WebSession $session -ContentType 'application/json' -Body $body -UseBasicParsing | Out-Null

# Acessar diagnóstico
$response = Invoke-WebRequest -Uri 'https://sistema-fazer-ias-2026-online-4tdj7uqd5.vercel.app/api/debug-turso' -WebSession $session -UseBasicParsing
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
