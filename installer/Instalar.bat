@echo off
setlocal
set ID=com.alexascencio.mypackspro
set DEST=%APPDATA%\Adobe\CEP\extensions\%ID%
set TMPZIP=%TEMP%\MyPacksPro_install.zip
set TMPDIR=%TEMP%\MyPacksPro_install

echo.
echo  Instalando My Packs Pro...
echo.

if not exist "%~dp0MyPacksPro.zxp" (
  echo  ERRO: MyPacksPro.zxp nao encontrado ao lado deste instalador.
  pause & exit /b 1
)

tasklist /FI "IMAGENAME eq Adobe Premiere Pro.exe" 2>NUL | find /I "Adobe Premiere Pro.exe" >NUL
if not errorlevel 1 (
  echo  Feche o Premiere Pro antes de instalar.
  pause & exit /b 1
)

:: Um .zxp e um zip assinado: da para extrair sem ferramenta externa.
:: Assim o pacote nao precisa de trazer a extensao duas vezes.
if exist "%TMPDIR%" rmdir /S /Q "%TMPDIR%"
copy /Y "%~dp0MyPacksPro.zxp" "%TMPZIP%" >NUL
powershell -NoProfile -Command "Expand-Archive -LiteralPath '%TMPZIP%' -DestinationPath '%TMPDIR%' -Force"
if errorlevel 1 (
  echo  ERRO ao extrair o pacote.
  pause & exit /b 1
)

if exist "%DEST%" rmdir /S /Q "%DEST%"
mkdir "%DEST%" 2>NUL
xcopy "%TMPDIR%" "%DEST%" /E /I /Y /Q >NUL
rmdir /S /Q "%TMPDIR%" 2>NUL
del /Q "%TMPZIP%" 2>NUL

:: Extensoes assinadas com certificado proprio precisam deste sinalizador.
:: E por utilizador (HKCU), nao exige administrador e nao afeta o sistema.
for %%V in (10 11 12 13 14 15 16) do (
  reg add "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f >NUL 2>&1
)

echo  Instalado com sucesso.
echo.
echo  Abra o Premiere e va em:  Janela ^> Extensoes ^> My Packs Pro
echo.
pause
