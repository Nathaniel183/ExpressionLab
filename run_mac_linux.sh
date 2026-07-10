#!/usr/bin/env bash
cd "$(dirname "$0")"
python3 -m http.server 8000 &
SERVER_PID=$!
if command -v open >/dev/null 2>&1; then open http://localhost:8000; elif command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:8000; fi
wait $SERVER_PID
