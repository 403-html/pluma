#!/bin/sh
set -e

# Run pending migrations before the server starts.
# DATABASE_URL must be provided at runtime via the environment.
node_modules/.bin/prisma migrate deploy

# Hand off to the API server process, replacing this shell.
exec node dist/index.js
