#!/bin/bash

# Caveo API EC2 User Data Script
# This script automatically sets up the EC2 instance with all dependencies

set -e

# Logging
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Starting Caveo API setup at $(date)"

# Update system
apt-get update -y
apt-get upgrade -y

# Install basic dependencies
apt-get install -y \
    curl \
    wget \
    git \
    htop \
    nano \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu
rm get-docker.sh

# Install Docker Compose
echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install AWS CLI v2
echo "Installing AWS CLI v2..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Configure Docker daemon
echo "Configuring Docker..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Enable and start Docker
systemctl enable docker
systemctl start docker

# Setup application directory
echo "Setting up application directory..."
mkdir -p /opt/caveo
chown ubuntu:ubuntu /opt/caveo
cd /opt/caveo

# Clone repository as ubuntu user
echo "Cloning repository..."
sudo -u ubuntu git clone ${git_repo} .

# Create production config
echo "Creating production configuration..."
cat > /opt/caveo/config.yml <<EOF
mode: production
secrets_manager:
  enabled: true
  region: ${aws_region}
  secrets:
    app: "caveo/app/environment"
fallback_to_env: false
EOF

chown ubuntu:ubuntu /opt/caveo/config.yml

# Build and start the application
echo "Building and starting application..."
sudo -u ubuntu docker-compose -f docker-compose.prod.yml build
sudo -u ubuntu docker-compose -f docker-compose.prod.yml up -d

# Create systemd service for auto-start
echo "Creating systemd service..."
cat > /etc/systemd/system/caveo-api.service <<EOF
[Unit]
Description=Caveo API Docker Container
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=ubuntu
WorkingDirectory=/opt/caveo
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
ExecReload=/usr/local/bin/docker-compose -f docker-compose.prod.yml restart
TimeoutStartSec=300
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
systemctl enable caveo-api.service

# Configure firewall
echo "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 3000/tcp
ufw --force enable

# Wait for application to start and test
echo "Waiting for application to start..."
sleep 60

# Health check
echo "Performing health check..."
for i in {1..30}; do
    if curl -f -s http://localhost:3000/health > /dev/null; then
        echo "✅ Application started successfully!"
        break
    fi
    echo "Waiting for application... ($i/30)"
    sleep 10
done

# Create update script
cat > /opt/caveo/update-app.sh <<'EOF'
#!/bin/bash
set -e
cd /opt/caveo
echo "Updating Caveo API..."
git pull origin main
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
echo "Update completed!"
EOF

chmod +x /opt/caveo/update-app.sh
chown ubuntu:ubuntu /opt/caveo/update-app.sh

# Setup log rotation
cat > /etc/logrotate.d/caveo-api <<EOF
/var/log/user-data.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 root root
}
EOF

echo "Setup completed successfully at $(date)"
echo "Application should be available at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
