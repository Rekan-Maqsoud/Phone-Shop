# Phone Shop Project - Line Count Command

To count lines of code in this project, use one of these commands:

## PowerShell (Windows):
```powershell
.\count-lines.ps1
```

## Bash (Linux/Mac/WSL):
```bash
./count-lines.sh
```

## Manual count (PowerShell one-liner):
```powershell
(Get-ChildItem -Recurse -Include "*.js","*.jsx","*.ts","*.tsx","*.cjs","*.css","*.html","*.md" | Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build" } | Get-Content | Measure-Object -Line).Lines
```

## What's excluded:
- node_modules/
- .git/
- dist/
- build/
- .next/
- package-lock.json, yarn.lock, pnpm-lock.yaml
- *.min.js, *.min.css files

Last updated: 2025-07-26 01:54:12
