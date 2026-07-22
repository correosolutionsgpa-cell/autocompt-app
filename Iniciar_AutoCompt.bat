@echo off
cd /d "%~dp0"
echo Iniciando el servidor de AutoCompt...
echo No cierres esta ventana mientras uses la aplicacion.
echo Cuando veas "Server running on http://localhost:3000", abre esa direccion en tu navegador.
echo.
npm run dev
pause
