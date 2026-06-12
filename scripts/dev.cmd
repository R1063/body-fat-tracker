@echo off
rem Claude Code のプレビュー用: セッションの PATH に Node.js が無い環境でも dev サーバーを起動できるようにする
set "PATH=%PATH%;C:\Program Files\nodejs"
cd /d "%~dp0.."
npm run dev
