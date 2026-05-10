# Second pass: catch remaining zinc references in structural/UI classes
$allFiles = Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\pages\*.tsx' -Recurse
$allFiles += Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\components\*.tsx'

$replacements = @(
  @('bg-zinc-700/60', 'bg-muted-foreground/30'),
  @('bg-zinc-800/20', 'bg-accent/20'),
  @('bg-zinc-800/30', 'bg-accent/30'),
  @('bg-zinc-800/50', 'bg-accent/50'),
  @('divide-zinc-800/30', 'divide-border/30'),
  @('text-zinc-700', 'text-muted-foreground'),
  @('text-zinc-600', 'text-muted-foreground')
)

foreach ($f in $allFiles) {
  $content = Get-Content $f.FullName -Raw
  $changed = $false
  foreach ($r in $replacements) {
    if ($content.Contains($r[0])) {
      $content = $content.Replace($r[0], $r[1])
      $changed = $true
    }
  }
  if ($changed) {
    Set-Content -Path $f.FullName -Value $content -NoNewline
    Write-Output "Updated: $($f.Name)"
  }
}
Write-Output 'Done.'
