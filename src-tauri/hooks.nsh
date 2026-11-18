; Hook NSIS para DepSyS - Limpia accesos directos obsoletos
!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Eliminando accesos directos anteriores de DepSyS Industrial..."
  Delete "$DESKTOP\DepSyS Industrial.lnk"
  Delete "$SMPROGRAMS\DepSyS Industrial.lnk"
  Delete "$SMPROGRAMS\DepSyS Industrial\DepSyS Industrial.lnk"
  RMDir /r "$SMPROGRAMS\DepSyS Industrial"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Asegurar que el acceso directo viejo sea purgado tras la instalacion
  Delete "$DESKTOP\DepSyS Industrial.lnk"
!macroend
