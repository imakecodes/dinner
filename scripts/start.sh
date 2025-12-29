#!/bin/sh
set -e

echo "Starting deployment script..."

# Run database migrations
echo "Running database migrations..."
if prisma migrate deploy; then
    echo "Migrations applied successfully."
else
    echo "Migration failed!"
    exit 1
fi

echo "Starting application..."
# Start the Next.js server (standalone mode)
exec node server.js
