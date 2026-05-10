# Replace text-white with text-foreground in pages, but ONLY when it's NOT 
# on the same className as a colored bg like bg-purple, bg-red, bg-orange, bg-emerald, bg-primary
# Strategy: replace all text-white, then restore specific patterns

$files = Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\pages\Sales.tsx',
  'e:\hjjg\bttffg\client\src\pages\Financeiro.tsx',
  'e:\hjjg\bttffg\client\src\pages\Products.tsx',
  'e:\hjjg\bttffg\client\src\pages\Profile.tsx',
  'e:\hjjg\bttffg\client\src\pages\Settings.tsx',
  'e:\hjjg\bttffg\client\src\pages\Checkouts.tsx',
  'e:\hjjg\bttffg\client\src\pages\Help.tsx',
  'e:\hjjg\bttffg\client\src\pages\FAQ.tsx',
  'e:\hjjg\bttffg\client\src\pages\EditProduct.tsx',
  'e:\hjjg\bttffg\client\src\pages\CreateProduct.tsx',
  'e:\hjjg\bttffg\client\src\pages\MembersArea.tsx'

# Simple replacements for standalone text-white usages that are clearly data/labels
$replacements = @(
  @('text-white mb-1', 'text-foreground mb-1'),
  @('text-white mb-2', 'text-foreground mb-2'),
  @('text-white mb-0.5', 'text-foreground mb-0.5'),
  @('font-bold text-white"', 'font-bold text-foreground"'),
  @('font-semibold text-white', 'font-semibold text-foreground'),
  @('font-medium text-white', 'font-medium text-foreground'),
  @('text-base font-bold text-white', 'text-base font-bold text-foreground'),
  @('text-lg font-medium text-white', 'text-lg font-medium text-foreground'),
  @('text-sm font-semibold text-white', 'text-sm font-semibold text-foreground'),
  @('text-sm text-white', 'text-sm text-foreground'),
  @('text-base font-bold text-white', 'text-base font-bold text-foreground'),
  @('text-sm font-medium text-white', 'text-sm font-medium text-foreground'),
  @('text-3xl font-bold text-white', 'text-3xl font-bold text-foreground'),
  @('text-xl font-bold text-white', 'text-xl font-bold text-foreground'),
  @('text-white text-xs', 'text-foreground text-xs'),
  @('text-white font-medium', 'text-foreground font-medium'),
  @('text-xs text-white', 'text-xs text-foreground'),
  @('bg-zinc-700/60', 'bg-muted-foreground/30')
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
