yarn run build

Remove-Item -Recurse -Force $env:localappdata\Yukari\yukari-ui
Copy-Item -Recurse build $env:localappdata\Yukari\yukari-ui