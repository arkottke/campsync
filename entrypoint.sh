#!/bin/sh

echo "Starting CampSync Services"
echo ""

# Start PocketBase in background (migrations run automatically on startup)
echo "Starting PocketBase on port 8090..."
/app/pocketbase/pocketbase serve --http=0.0.0.0:8090 --dir=/app/pb_data --migrationsDir=/app/pb_migrations &
PB_PID=$!

# Start frontend
echo "Starting frontend on port 3000..."
serve -s /app/dist -l 3000 &
SERVE_PID=$!

# Shut down both services on signal
trap 'kill $PB_PID $SERVE_PID 2>/dev/null' INT TERM

# Wait for either process to exit
wait -n $PB_PID $SERVE_PID 2>/dev/null || wait $PB_PID
