#!/bin/sh
cd "$(dirname "$0")" || exit 1
if [ -x ./runtime/node ]; then
  ./runtime/node ./server/build/setup.js
else
  if ! command -v node >/dev/null 2>&1; then
    echo 'Install Node.js 22 or newer from https://nodejs.org, then reopen Setup.'
  else
    npm ci --ignore-scripts && npm run build && node ./server/build/setup.js
  fi
fi
printf '\nPress Enter to close.'
read answer
