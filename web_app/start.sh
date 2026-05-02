#!/bin/bash
PORT=8080
echo ""
echo "  ⬡  MythosReady — AI Security Framework Explorer"
echo "  ─────────────────────────────────────────────"
echo "  Starting local server on http://localhost:$PORT"
echo "  Press Ctrl+C to stop."
echo ""
open "http://localhost:$PORT"
cd "$(dirname "$0")" && python3 -m http.server $PORT
