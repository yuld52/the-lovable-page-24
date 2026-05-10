$files = Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\pages\*.tsx', 'e:\hjjg\bttffg\client\src\components\*.tsx'
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $changed = $false
    
    $replacements = @(
        @('bg-zinc-950/30', 'bg-muted/30'),
        @('bg-zinc-950', 'bg-muted'),
        @('border-zinc-700', 'border-border'),
        @('file:bg-zinc-800', 'file:bg-accent'),
        @('file:text-white', 'file:text-foreground')
    )

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
