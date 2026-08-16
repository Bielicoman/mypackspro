@echo off
setlocal
set ID=com.alexascencio.mypackspro
set DEST=%APPDATA%\Adobe\CEP\extensions\%ID%

echo.
if exist "%DEST%" (
  rmdir /S /Q "%DEST%"
  echo  My Packs Pro removido.
) else (
  echo  My Packs Pro nao estava instalado.
)
echo.
echo  Os seus packs e o cache continuam em %%APPDATA%%\MyPacksPro
echo  Apague essa pasta manualmente se quiser remover tudo.
echo.
pause
