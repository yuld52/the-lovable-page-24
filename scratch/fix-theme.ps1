$files = Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\pages\*.tsx'
$files += Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\components\Sidebar.tsx'
$files += Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\components\ChatSupport.tsx'
$files += Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\components\NotificationModal.tsx'
$files += Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\components\InstallPrompt.tsx'
$files += Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\components\SalesBadges.tsx'
$files += Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\components\Header.tsx'

$replacements = @(
  @('bg-[#18181b]', 'bg-card'),
  @('bg-zinc-950/50', 'bg-muted/80'),
  @('bg-zinc-900/50', 'bg-muted/50'),
  @('bg-zinc-900/40', 'bg-muted/40'),
  @('bg-zinc-900', 'bg-muted'),
  @('border-zinc-800/60', 'border-border/60'),
  @('border-zinc-800/50', 'border-border/50'),
  @('border-zinc-800/40', 'border-border/40'),
  @('border-zinc-800', 'border-border'),
  @('hover:bg-zinc-800', 'hover:bg-accent'),
  @('hover:border-zinc-600', 'hover:border-border'),
  @('hover:text-white', 'hover:text-foreground'),
  @('text-zinc-300', 'text-foreground/80'),
  @('text-zinc-500', 'text-muted-foreground'),
  @('text-zinc-400', 'text-muted-foreground')
)

foreach ($f in $files) {
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
