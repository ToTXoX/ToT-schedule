#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

npm run tauri:build -- --bundles dmg
"$PROJECT_ROOT/scripts/add-fix-script-to-dmg.sh"

