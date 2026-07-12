$ErrorActionPreference = 'Stop'

$server = '78.17.132.217'
$key = Join-Path $env:USERPROFILE '.ssh\id_ed25519_well_climate'
$ssh = 'C:\Windows\System32\OpenSSH\ssh.exe'
$telegramPublicUrl = 'https://t.me/Ekkobzev'
$metrikaId = '110622251'

Write-Host 'Enter a NEW bot token. It will not be saved on this computer.' -ForegroundColor Cyan
$secureToken = Read-Host 'New Telegram bot token' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}

if ($token -notmatch '^\d+:[A-Za-z0-9_-]{30,}$') { throw 'Invalid Telegram Bot API token format.' }
$bot = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getMe" -TimeoutSec 20
if (-not $bot.ok) { throw 'Telegram did not accept the token.' }

Write-Host "Open @$($bot.result.username) in Telegram and send /start." -ForegroundColor Yellow
Read-Host 'After sending /start, press Enter here'
$updates = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getUpdates?limit=100" -TimeoutSec 20
$privateMessages = @($updates.result | Where-Object { $_.message.chat.type -eq 'private' })
if (-not $privateMessages.Count) { throw 'No private chat found. Send /start to the bot and run this script again.' }
$chatId = $privateMessages[-1].message.chat.id

$content = @"
TELEGRAM_PUBLIC_URL=$telegramPublicUrl
TELEGRAM_BOT_TOKEN=$token
TELEGRAM_CHAT_ID=$chatId
YANDEX_METRIKA_ID=$metrikaId
"@

$content | & $ssh -o BatchMode=yes -o IdentitiesOnly=yes -i $key "root@$server" "umask 077; install -d -m 0700 /etc/well-climate; cat > /etc/well-climate/well-climate.env; chmod 600 /etc/well-climate/well-climate.env"
if ($LASTEXITCODE -ne 0) { throw 'Could not save settings on the server.' }

$test = @{ chat_id = $chatId; text = 'Well-Climate lead delivery is configured. Website enquiries will arrive in this chat after deployment.' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/sendMessage" -ContentType 'application/json' -Body $test -TimeoutSec 20 | Out-Null
$token = $null
Write-Host 'Settings saved on the server. Test message sent.' -ForegroundColor Green
