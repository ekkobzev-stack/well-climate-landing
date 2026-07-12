param(
  [string]$HostName = '78.17.132.217',
  [string]$User = 'root',
  [int]$Port = 22,
  [string]$Key = "$env:USERPROFILE\.ssh\id_ed25519_well_climate"
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
& .\node_modules\.bin\vinext.cmd build
if ($LASTEXITCODE) { throw 'Production build failed; nothing was uploaded.' }
$release = Get-Date -Format 'yyyyMMdd-HHmmss'
$ssh = 'C:\Windows\System32\OpenSSH\ssh.exe'
$scp = 'C:\Windows\System32\OpenSSH\scp.exe'
& $ssh -o BatchMode=yes -o IdentitiesOnly=yes -i $Key -p $Port "$User@$HostName" "install -d -m 0755 /var/www/well-climate/releases/$release"
& $scp -o BatchMode=yes -o IdentitiesOnly=yes -i $Key -P $Port -r dist package.json package-lock.json .npmrc "${User}@${HostName}:/var/www/well-climate/releases/$release/"
if ($LASTEXITCODE) { throw 'Upload failed; the active release was not changed.' }
$cmd = "set -e; r=/var/www/well-climate/releases/$release; cd `"`$r`"; export PATH=/opt/well-climate/node/bin:`$PATH; npm ci --include=dev; node -e `"import('./dist/server/index.js').then(m=>{if(!m.default||typeof m.default.fetch!=='function')throw new Error('artifact')})`"; readlink -f /var/www/well-climate/current > /var/www/well-climate/previous-release; ln -s `"`$r`" /var/www/well-climate/current.next; mv -T /var/www/well-climate/current.next /var/www/well-climate/current; chmod -R a+rX `"`$r/dist`"; systemctl restart well-climate.service; sleep 2; curl -fsS http://127.0.0.1:3001/ >/dev/null"
$encodedCmd = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cmd))
& $ssh -o BatchMode=yes -o IdentitiesOnly=yes -i $Key -p $Port "$User@$HostName" "echo $encodedCmd | base64 -d | bash"
if ($LASTEXITCODE) { throw 'Activation failed; run deploy\rollback.ps1.' }
Write-Host "Release $release is active."
