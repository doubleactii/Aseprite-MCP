#!/bin/sh
cd "$(dirname "$0")" || exit 1
if [ -x ./runtime/node ]; then
  exec ./runtime/node ./server/build/setup.js
fi
command -v node >/dev/null 2>&1 || { echo 'Install Node.js 22+ from https://nodejs.org, then rerun Setup.'; exit 1; }
npm ci --ignore-scripts && npm run build && node ./server/build/setup.js
