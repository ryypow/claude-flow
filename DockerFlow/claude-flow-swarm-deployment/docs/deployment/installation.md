# Installation Guide

Complete step-by-step installation guide for Claude Flow v2 Docker Swarm deployment.

## 📋 Prerequisites

### System Requirements

**Minimum Requirements:**
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB free space
- **Network**: Reliable internet connection

**Recommended Requirements:**
- **CPU**: 8+ cores (optimized for 14-core systems)
- **RAM**: 16GB+ (optimized for 32GB)
- **Storage**: 100GB+ SSD
- **Network**: High-speed broadband

### Software Requirements

**Docker Engine:**
```bash
# Check Docker version (v28.0+ required)
docker --version
Docker version 28.0.0+

# Verify Docker Swarm capability
docker swarm --help
```

**Operating System Support:**
- **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+, Debian 11+
- **Windows**: Windows 10/11 with WSL2 and Docker Desktop
- **macOS**: macOS 11+ with Docker Desktop

## 🚀 Quick Installation

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-flow-swarm-deployment.git
cd claude-flow-swarm-deployment

# Verify files
ls -la
```

### Step 2: Docker Swarm Setup

```bash
# Initialize Docker Swarm (if not already done)
docker swarm init

# Verify swarm status
docker node ls
```

**Expected output:**
```
ID                            HOSTNAME   STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
abc123def456 *                node1      Ready     Active         Leader           28.0.0
```

### Step 3: API Key Configuration

```bash
# Create Anthropic API key secret
echo 'your-actual-anthropic-api-key' | docker secret create anthropic_api_key -

# Verify secret creation
docker secret ls
```

**Important:** Replace `your-actual-anthropic-api-key` with your real API key from Anthropic.

### Step 4: Build and Deploy

```bash
# Build the image (first time: 15-20 minutes)
./swarm-manage.sh build

# Deploy the stack
./swarm-manage.sh deploy

# Check deployment status
./swarm-manage.sh status
```

### Step 5: Initialize Claude Flow

```bash
# Initialize the system
./swarm-manage.sh init-alpha

# Verify initialization
./swarm-manage.sh logs | grep "Successfully initialized"
```

### Step 6: Access the Application

```bash
# Check if services are ready
curl http://localhost:4000/api/status

# Access Web UI
open http://localhost:4000/console/
```

## 🔧 Detailed Installation

### Network Configuration

**Port Requirements:**
- `4000`: Web UI and WebSocket server
- `4001`: API endpoints  
- `4080`: Tools and utilities

**Firewall Configuration:**
```bash
# Ubuntu/Debian
sudo ufw allow 4000/tcp
sudo ufw allow 4001/tcp
sudo ufw allow 4080/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=4000/tcp
sudo firewall-cmd --permanent --add-port=4001/tcp
sudo firewall-cmd --permanent --add-port=4080/tcp
sudo firewall-cmd --reload
```

### Docker Swarm Advanced Setup

**Multi-node Setup:**
```bash
# On manager node
docker swarm init --advertise-addr YOUR_MANAGER_IP

# On worker nodes (use the token from init output)
docker swarm join --token SWMTKN-... YOUR_MANAGER_IP:2377

# Verify cluster
docker node ls
```

**Node Labels:**
```bash
# Label nodes for placement constraints
docker node update --label-add role=manager node1
docker node update --label-add role=worker node2
```

### Custom Configuration

**Environment Variables:**
```bash
# Create custom environment file
cat > .env << EOF
API_PORT=4000
UI_PORT=4001
TOOLS_PORT=4080
LOG_LEVEL=info
NODE_ENV=production
EOF
```

**Resource Limits:**
```bash
# Edit docker-stack.yml for custom resource limits
vim docker-stack.yml

# Update the resources section:
resources:
  limits:
    memory: 32G
    cpus: '16.0'
  reservations:
    memory: 16G
    cpus: '8.0'
```

## 🔍 Verification Steps

### Health Checks

```bash
# 1. Service Health
./swarm-manage.sh status

# Expected: All services should show "Running" status

# 2. API Endpoint Test
curl -H "Content-Type: application/json" \
     -d '{"method":"ping","id":1}' \
     http://localhost:4001/api/

# Expected: {"jsonrpc":"2.0","id":1,"result":"pong"}

# 3. WebSocket Test
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:4000/ws

# Expected: HTTP 101 Switching Protocols

# 4. Web UI Test
curl -s http://localhost:4000/console/ | grep -i "claude flow"

# Expected: Should return HTML with "Claude Flow" in title
```

### Log Verification

```bash
# Check for successful initialization
./swarm-manage.sh logs | grep -E "(Started|Ready|Listening)"

# Look for errors
./swarm-manage.sh logs | grep -i error

# Monitor real-time logs
./swarm-manage.sh logs -f
```

## 🐛 Troubleshooting Installation

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the ports
ss -tlnp | grep -E ':(4000|4001|4080)'

# Kill conflicting processes or change ports in docker-stack.yml
```

**2. Docker Swarm Not Initialized**
```bash
# Error: "This node is not a swarm manager"
docker swarm init

# If you get an IP address error:
docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')
```

**3. API Key Issues**
```bash
# Verify secret exists
docker secret ls | grep anthropic

# Recreate secret if needed
docker secret rm anthropic_api_key
echo 'new-api-key' | docker secret create anthropic_api_key -
```

**4. Build Failures**
```bash
# Clean up and retry
docker system prune -f
./swarm-manage.sh remove
./swarm-manage.sh build
```

**5. WebSocket Connection Issues**
```bash
# Check if container is running on correct port
docker ps | grep claude-flow

# Verify port mapping
docker port $(docker ps -q --filter ancestor=claude-flow-alpha)

# Test internal connectivity
docker exec -it $(docker ps -q) curl localhost:4000/api/status
```

### Advanced Troubleshooting

**Debug Mode:**
```bash
# Enable debug logging
export DEBUG=claude-flow:*
./swarm-manage.sh deploy

# Check detailed logs
./swarm-manage.sh logs -f
```

**Container Inspection:**
```bash
# Access container shell
./swarm-manage.sh shell

# Inside container - check processes
ps aux | grep claude-flow

# Check listening ports
netstat -tlnp
```

**Network Debugging:**
```bash
# Check overlay network
docker network ls | grep claude

# Inspect network details
docker network inspect claude-flow-network

# Test service connectivity
docker exec -it $(docker ps -q) ping claude-flow-alpha
```

## ✅ Post-Installation Steps

### Security Hardening

```bash
# 1. Update default passwords (if any)
# 2. Configure SSL/TLS (see security.md)
# 3. Set up monitoring (see performance.md)
# 4. Configure backups
```

### Performance Optimization

```bash
# 1. Adjust resource limits based on your hardware
# 2. Configure logging levels appropriately
# 3. Set up monitoring and alerting
```

### Backup Configuration

```bash
# Create backup of configuration
tar -czf claude-flow-backup-$(date +%Y%m%d).tar.gz \
    docker-stack.yml swarm-manage.sh .env

# Store securely
mv claude-flow-backup-*.tar.gz /path/to/secure/storage/
```

## 📚 Next Steps

After successful installation:

1. **[Configuration Guide](configuration.md)** - Customize your deployment
2. **[API Documentation](../api/README.md)** - Learn the API
3. **[Architecture Overview](../architecture/README.md)** - Understand the system
4. **[Security Guide](security.md)** - Secure your deployment

## 🆘 Getting Help

If you encounter issues during installation:

1. Check the [Troubleshooting Guide](../troubleshooting/README.md)
2. Search [existing issues](../../issues)
3. Create a [new issue](../../issues/new) with:
   - Your OS and Docker version
   - Complete error messages
   - Relevant log output
   - Steps you've already tried

---

**Installation successful?** ⭐ Star the repository and move on to [configuration](configuration.md)!
