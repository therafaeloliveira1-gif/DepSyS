$secPass = ConvertTo-SecureString '3232' -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential('DepSyS', $secPass)
Invoke-Command -ComputerName '192.168.1.125' -Credential $cred -ScriptBlock {
    Write-Output "HOLA DESDE $(hostname)"
    Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, TotalPhysicalMemory
}

