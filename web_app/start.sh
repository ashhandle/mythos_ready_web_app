#!/bin/bash
PORT=8080
echo ""
echo "  ⬡  FrontierAI Ready — AI Security Control Readiness"
echo "  ─────────────────────────────────────────────"
echo "  Starting local server on http://localhost:$PORT"
echo "  Press Ctrl+C to stop."
echo ""
open "http://localhost:$PORT"
cd "$(dirname "$0")" && python3 -m http.server $PORT
