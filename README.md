# yukari-ui

## 開発

### プレビュー
```ps1
yarn run start
```

### ビルドのみ

```ps1
yarn run build
```

### ビルド後配置

```ps1
yarn run build
if(Test-Path "$env:localappdata\Yukari\yukari-ui"){
    Remove-Item -Recurse -Force "$env:localappdata\Yukari\yukari-ui"
}
Copy-Item -Recurse build "$env:localappdata\Yukari\yukari-ui"
```
