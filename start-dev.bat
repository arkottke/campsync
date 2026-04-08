@echo off
REM Quick setup script to start PocketBase and CampSync on Windows

echo.
echo 🚀 Starting CampSync Development Environment
echo.

REM Check if PocketBase data directory exists
if not exist "pb_data" (
  echo 📁 Creating pb_data directory...
  mkdir pb_data
)

REM Check if PocketBase binary exists
if not exist "pocketbase\pocketbase.exe" (
  echo 📥 PocketBase not found!
  echo.
  echo Please download PocketBase from: https://pocketbase.io/docs/
  echo 1. Download Windows .zip file
  echo 2. Extract to "pocketbase" folder in this directory
  echo 3. Re-run this script
  echo.
  pause
  exit /b 1
)

REM Start PocketBase in background
echo.
echo Starting PocketBase on port 8090...
start "PocketBase" cmd /k "pocketbase\pocketbase.exe serve --http=127.0.0.1:8090 --dir=pb_data"
echo ✅ PocketBase started

REM Wait a moment for PocketBase to start
timeout /t 2 /nobreak

REM Start frontend in background
echo.
echo Starting CampSync frontend on port 3000...
start "CampSync Frontend" cmd /k "npm run dev"
echo ✅ Frontend started

echo.
echo ===============================================
echo 🎉 CampSync Development Environment Running!
echo ===============================================
echo.
echo 📱 Frontend:      http://localhost:3000
echo ⚙️  PocketBase:    http://localhost:8090/_/
echo.
echo Close the command windows to stop services
echo.
pause
