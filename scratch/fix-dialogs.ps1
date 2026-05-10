$files = Get-ChildItem -Path 'e:\hjjg\bttffg\client\src\pages\*.tsx', 'e:\hjjg\bttffg\client\src\components\*.tsx'
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $changed = $false
    if ($content -match 'DialogContent[^>]*text-white') {
        # Using a simpler replace that targets the specific pattern seen in grep
        $newContent = $content -replace 'className="([^"]*)text-white([^"]*)"', 'className="$1text-foreground$2"'
        if ($newContent -ne $content) {
            $content = $newContent
            $changed = $true
        }
    }
    if ($changed) {
        Set-Content -Path $f.FullName -Value $content -NoNewline
        Write-Output "Updated: $($f.Name)"
    }
}
Write-Output 'Done.'
