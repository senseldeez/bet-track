@echo off
title EdgeTrack Server
echo Starting EdgeTrack betting analytics tracker...
cd /d "%~dp0"
start "" http://localhost:3000
call npm run dev
