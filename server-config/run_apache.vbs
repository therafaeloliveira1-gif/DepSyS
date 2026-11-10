Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Apache24"
WshShell.Run "C:\Apache24\bin\httpd.exe -d C:/Apache24", 0, False
