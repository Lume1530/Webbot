# DLS Group Deployment Guide

This guide will help you deploy your application to work with your domain `dlsgroup.org.in`.

## Prerequisites

1. **VPS with Ubuntu/Debian**
2. **Domain pointing to your VPS IP** (A record)
3. **Root or sudo access**

## Step 1: Server Setup

### Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Install PM2 for process management
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

## Step 2: Domain Configuration

### DNS Settings
Make sure your domain `dlsgroup.org.in` has these DNS records:
- **A Record**: `dlsgroup.org.in` → `YOUR_VPS_IP`
- **A Record**: `www.dlsgroup.org.in` → `YOUR_VPS_IP`

### SSL Certificate
```bash
# Get SSL certificate
sudo certbot --nginx -d dlsgroup.org.in -d www.dlsgroup.org.in
```

## Step 3: Application Setup

### Clone and Configure
```bash
# Navigate to web directory
cd /var/www

# Clone your repository (replace with your actual repo)
sudo git clone YOUR_REPOSITORY_URL dlsgroup.org.in
cd dlsgroup.org.in

# Install dependencies
npm install

# Create environment file
cp env.example .env
nano .env  # Edit with your actual values
```

### Environment Configuration
Edit `.env` file with your actual values:
```env
DATABASE_URL=postgresql://postgres:Cla$h123@db.oeagzcuecovjjcpmxolo.supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SUPPORT_EMAIL=support@dlsgroup.org.in
FRONTEND_URL=https://dlsgroup.org.in
BACKEND_URL=https://dlsgroup.org.in
```

## Step 4: Nginx Configuration

### Copy Nginx Config
```bash
# Copy the nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/dlsgroup.org.in

# Enable the site
sudo ln -s /etc/nginx/sites-available/dlsgroup.org.in /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 5: Deploy Application

### Build and Deploy
```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Manual Deployment (if script fails)
```bash
# Build frontend
npm run build

# Start backend with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

## Step 6: Firewall Configuration

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Step 7: Testing

### Test Your Deployment
1. **Frontend**: Visit `https://dlsgroup.org.in`
2. **API**: Test `https://dlsgroup.org.in/api/health`
3. **SSL**: Verify SSL certificate is working

### Common Issues

#### 1. Domain Not Loading
- Check DNS propagation: `nslookup dlsgroup.org.in`
- Verify A record points to correct IP
- Check firewall settings

#### 2. SSL Issues
- Renew certificate: `sudo certbot renew`
- Check certificate: `sudo certbot certificates`

#### 3. Backend Not Responding
- Check PM2 status: `pm2 status`
- Check logs: `pm2 logs dlsgroup-backend`
- Verify port 4000 is not blocked

#### 4. Nginx Issues
- Check Nginx status: `sudo systemctl status nginx`
- Check logs: `sudo tail -f /var/log/nginx/error.log`

## Maintenance

### Regular Updates
```bash
# Update application
git pull origin main
npm install
npm run build
pm2 restart dlsgroup-backend

# Update SSL certificate
sudo certbot renew
```

### Monitoring
```bash
# Check application status
pm2 status
pm2 logs dlsgroup-backend

# Check Nginx status
sudo systemctl status nginx
```

## Support

If you encounter issues:
1. Check the logs: `pm2 logs` and `sudo tail -f /var/log/nginx/error.log`
2. Verify all services are running
3. Test connectivity to your database
4. Ensure all environment variables are set correctly

Your application should now be accessible at `https://dlsgroup.org.in`! 