param(
  [string]$HostName = '78.17.132.217',
  [string]$User = 'root',
  [int]$Port = 22,
  [string]$Key = "$env:USERPROFILE\.ssh\id_ed25519_well_climate"
)

$ssh = 'C:\Windows\System32\OpenSSH\ssh.exe'
& $ssh -o BatchMode=yes -o IdentitiesOnly=yes -i $Key -p $Port "$User@$HostName" 'set -e; previous=$(cat /var/www/well-climate/previous-release); test -d "$previous"; ln -s "$previous" /var/www/well-climate/current.next; mv -T /var/www/well-climate/current.next /var/www/well-climate/current; systemctl restart well-climate.service; sleep 2; curl -fsS http://127.0.0.1:3001/ >/dev/null; echo "Rolled back to $previous"'
if ($LASTEXITCODE) { throw 'Rollback failed; the current release was left unchanged.' }
