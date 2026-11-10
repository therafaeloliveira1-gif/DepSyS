$targets = @(
    @{ Src = '\\MARCELOPC\Users\PC01\Desktop';   Dst = 'C:\WorkSpace\BACKUP_MARCELOPC\Desktop' },
    @{ Src = '\\MARCELOPC\Users\PC01\Documents'; Dst = 'C:\WorkSpace\BACKUP_MARCELOPC\Documents' },
    @{ Src = '\\MARCELOPC\Users\PC01\Pictures';  Dst = 'C:\WorkSpace\BACKUP_MARCELOPC\Pictures' },
    @{ Src = '\\MARCELOPC\Users\PC01\Downloads'; Dst = 'C:\WorkSpace\BACKUP_MARCELOPC\Downloads' },
    @{ Src = '\\MARCELOPC\C$\inst';              Dst = 'C:\WorkSpace\BACKUP_MARCELOPC\inst' }
)

foreach ($t in $targets) {
    Write-Host "=========================================================="
    Write-Host "Copiando: $($t.Src) -> $($t.Dst)"
    Write-Host "=========================================================="
    robocopy $t.Src $t.Dst /E /MT:16 /R:1 /W:1 /NP /NFL /NDL
}
Write-Host "=========================================================="
Write-Host "BACKUP COMPLETADO CON EXITO"
Write-Host "=========================================================="

