@echo off
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system" && (
    echo Adding firewall rule...
    netsh advfirewall firewall add rule name="Node6000" dir=in action=allow protocol=TCP localport=6000 profile=any
    echo Starting server...
    node "C:\Users\Pc\Desktop\AiClass\server.js"
    pause
) || (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0'"
    pause
)
