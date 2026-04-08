#!/bin/bash
# Quick setup script to start PocketBase and CampSync

echo "🚀 Starting CampSync Development Environment"
echo ""

# Parse args
for arg in "$@"; do
  case "$arg" in
    -h|--help)
      echo "Usage: ./start-dev.sh"
      exit 0
      ;;
    *)
      echo "❌ Unknown option: $arg"
      echo "Usage: ./start-dev.sh"
      exit 1
      ;;
  esac
done

# Check if PocketBase data directory exists
if [ ! -d "pb_data" ]; then
  echo "📁 Creating pb_data directory..."
  mkdir -p pb_data
fi

# Download PocketBase if not present
POCKETBASE_DIR="./pocketbase"
if [ ! -f "$POCKETBASE_DIR/pocketbase" ]; then
  echo "📥 Downloading PocketBase..."
  mkdir -p $POCKETBASE_DIR

  # Detect OS
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    wget -O $POCKETBASE_DIR/pocketbase.zip https://github.com/pocketbase/pocketbase/releases/download/v0.36.8/pocketbase_0.36.8_linux_amd64.zip
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    wget -O $POCKETBASE_DIR/pocketbase.zip https://github.com/pocketbase/pocketbase/releases/download/v0.36.8/pocketbase_0.36.8_darwin_amd64.zip
  else
    echo "❌ Unsupported OS. Please download PocketBase manually from https://pocketbase.io and extract to ./pocketbase/"
    exit 1
  fi

  cd $POCKETBASE_DIR
  unzip -oq pocketbase.zip
  rm pocketbase.zip
  chmod +x pocketbase
  cd ..
  echo "✅ PocketBase downloaded and extracted"
fi

# Start PocketBase in background (migrations in ./pb_migrations run automatically)
echo ""
echo "Starting PocketBase on port 8090..."
./pocketbase/pocketbase serve --http=127.0.0.1:8090 --dir=./pb_data &
PB_PID=$!
echo "✅ PocketBase started (PID: $PB_PID)"

# Start frontend in background
echo "Starting CampSync frontend on port 3000..."
npm run dev &
APP_PID=$!
echo "✅ Frontend started (PID: $APP_PID)"

echo ""
echo "==============================================="
echo "🎉 CampSync Development Environment Running!"
echo "==============================================="
echo ""
echo "📱 Frontend:      http://localhost:3000"
echo "⚙️  PocketBase:    http://localhost:8090/_/"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for both processes
wait
