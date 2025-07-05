#!/bin/bash

# DLS Group Deployment Script
# This script builds and deploys the application to production

set -e  # Exit on any error

echo "🚀 Starting deployment for dlsgroup.org.in..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found! Please create one based on env.example"
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Build frontend
print_status "Building frontend..."
npm run build

# Create deployment directory
DEPLOY_DIR="/var/www/dlsgroup.org.in"
print_status "Creating deployment directory: $DEPLOY_DIR"
sudo mkdir -p $DEPLOY_DIR

# Copy built files
print_status "Copying built files..."
sudo cp -r dist/* $DEPLOY_DIR/

# Set proper permissions
print_status "Setting permissions..."
sudo chown -R www-data:www-data $DEPLOY_DIR
sudo chmod -R 755 $DEPLOY_DIR

# Restart Node.js application
print_status "Restarting Node.js application..."
if pm2 list | grep -q "dlsgroup"; then
    pm2 restart dlsgroup
else
    pm2 start server/index.cjs --name dlsgroup
fi

# Reload Nginx
print_status "Reloading Nginx..."
sudo systemctl reload nginx

# Test the deployment
print_status "Testing deployment..."
sleep 5
if curl -f -s https://dlsgroup.org.in/health > /dev/null; then
    print_status "✅ Deployment successful! Your site is live at https://dlsgroup.org.in"
else
    print_warning "⚠️  Deployment completed but health check failed. Please verify manually."
fi

echo "🎉 Deployment completed!" 