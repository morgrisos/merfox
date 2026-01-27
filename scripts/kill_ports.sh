#!/bin/bash
# P8.10: Last Resort Kill Script
# Only kills processes that:
# 1. Are "node" or "Electron" or "merfox"
# 2. Use port 3000 or 3001
# 3. Belong to the current user
# 4. Are NOT the current script itself
# This avoids killing system processes or other users' apps.

USER_ID=$(id -u)
PORTS="3000,3001"

echo "Checking for lingering processes on ports $PORTS..."

PIDS=$(lsof -ti :$PORTS | paste -s -d, -)

if [ -z "$PIDS" ]; then
  echo "Ports clean."
  exit 0
fi

# Filter PIDs by user and command name
# ps -p <PID> -o user,comm
for pid in $(echo $PIDS | tr ',' ' '); do
    PROC_INFO=$(ps -p $pid -o uid=,comm=)
    PROC_UID=$(echo $PROC_INFO | awk '{print $1}')
    PROC_NAME=$(echo $PROC_INFO | awk '{print $2}')
    
    if [ "$PROC_UID" == "$USER_ID" ]; then
        if [[ "$PROC_NAME" == *"node"* ]] || [[ "$PROC_NAME" == *"Electron"* ]] || [[ "$PROC_NAME" == *"merfox"* ]]; then
            echo "Killing stale process: PID $pid ($PROC_NAME)"
            kill -9 $pid 2>/dev/null || true
        else
            echo "Skipping unrelated process: PID $pid ($PROC_NAME)"
        fi
    fi
done

echo "Cleanup complete."
