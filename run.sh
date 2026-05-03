#!/bin/bash
# Djibril Tracking — Launch script
cd "$(dirname "$0")"

# Install deps if needed
pip install -q fastapi uvicorn 2>/dev/null

# Run
python3 server.py "$@"
