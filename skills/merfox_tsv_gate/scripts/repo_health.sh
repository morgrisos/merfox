#!/bin/bash
set -euo pipefail
echo "REPO_HEALTH"
du -sh . 2>/dev/null | head -n 1
git status -s | head -n 5
