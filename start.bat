@echo off

:main
cls
echo Tobjod API utility for service - Micro Service
echo.=======================================
echo.1. Start Service
echo.2. Stop Service (remove service from pm2)
echo.3. Restart Service
echo.q. Quit this utility
echo.
echo Please enter your choice
echo %date% %time%
choice /c 123456q /d q /t 10 > nul

if %errorlevel% EQU 1 goto start_service
if %errorlevel% EQU 2 goto stop_service
if %errorlevel% EQU 3 goto restart_service
if %errorlevel% EQU 7 goto quit_utility
goto quit_utility

:start_service
call pm2 start tj-service.config.js
goto quit_utility

:restart_service
call pm2 restart tj-service.config.js
goto quit_utility

:stop_service
call pm2 stop tj-service.config.js
call pm2 delete tj-service.config.js
goto quit_utility

:config_service
echo.Please enter environment name
set /p TJ_ENV_NAME=

FOR /F "tokens=2 delims==" %%i in ('set %TJ_ENV_NAME%') do set TJ_ENV_VALUE=%%i

echo Environment: %TJ_ENV_NAME% is currently %TJ_ENV_VALUE%

echo Set new value or just enter to keep current value
set /p TBJ_ENV_VALUE_NEW=
if NOT "%TBJ_ENV_VALUE_NEW%"=="" (
  echo New value will be overwritten %TBJ_ENV_VALUE_NEW%
  set %TJ_ENV_NAME%=%TBJ_ENV_VALUE_NEW%
  call pm2 restart %TJ_B_API_INSTANCE_NAME% --update-env
)

pause
goto main

:quit_utility
echo.Bye

endlocal
