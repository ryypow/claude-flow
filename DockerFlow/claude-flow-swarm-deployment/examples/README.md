# Examples

Practical examples and configurations for Claude Flow v2 Docker Swarm deployment.

## 📁 Example Categories

### 🚀 [Basic Setup](basic/)
Simple configurations to get started quickly:
- [Minimal Configuration](basic/minimal-setup.md) - Bare minimum setup
- [Single Node Deployment](basic/single-node.md) - Development environment
- [Port Configuration](basic/custom-ports.md) - Custom port mappings

### 🏭 [Production Setup](production/)
Enterprise-ready configurations:
- [High Availability](production/high-availability.md) - Multi-node production setup
- [Load Balancing](production/load-balancing.md) - Advanced load balancing
- [Security Hardening](production/security.md) - Production security configuration
- [Monitoring & Alerting](production/monitoring.md) - Complete monitoring stack

### 💻 [Development](development/)
Development and testing configurations:
- [Development Environment](development/dev-setup.md) - Local development
- [Testing Configuration](development/testing.md) - CI/CD integration
- [Debug Mode](development/debug.md) - Enhanced debugging

### ⚙️ [Custom Configurations](custom/)
Advanced customization examples:
- [Custom Resource Limits](custom/resources.md) - Memory and CPU tuning
- [Network Configuration](custom/networking.md) - Advanced networking
- [Storage Configuration](custom/storage.md) - Persistent storage options
- [Multi-Environment](custom/multi-env.md) - Multiple environments

## 🎯 Quick Start Examples

### Basic Single-Node Setup

```bash
# Clone and setup
git clone https://github.com/yourusername/claude-flow-swarm-deployment.git
cd claude-flow-swarm-deployment

# Copy basic configuration
cp examples/basic/docker-stack-basic.yml docker-stack.yml

# Deploy
docker swarm init
echo 'your-api-key' | docker secret create anthropic_api_key -
./swarm-manage.sh build
./swarm-manage.sh deploy
```

### Production Multi-Node Setup

```bash
# On manager node
docker swarm init --advertise-addr MANAGER_IP

# Copy production configuration
cp examples/production/docker-stack-production.yml docker-stack.yml
cp examples/production/.env-production .env

# Deploy with production settings
./swarm-manage.sh build
./swarm-manage.sh deploy
```

### Development with Debug Mode

```bash
# Copy development configuration
cp examples/development/docker-stack-dev.yml docker-stack.yml
cp examples/development/.env-development .env

# Enable debug mode
export DEBUG=claude-flow:*
./swarm-manage.sh deploy
```

## 📋 Configuration Templates

### Environment Variables Template

```bash
# .env template
API_PORT=4000
UI_PORT=4001
TOOLS_PORT=4080
NODE_ENV=production
LOG_LEVEL=info
MAX_AGENTS=64
WEBSOCKET_TIMEOUT=30000
API_RATE_LIMIT=100
```

### Docker Stack Template

```yaml
# Basic docker-stack.yml template
version: '3.8'

services:
  claude-flow-alpha:
    image: claude-flow-alpha:latest
    ports:
      - target: 3000
        published: 4000
        protocol: tcp
        mode: ingress
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - API_PORT=${API_PORT:-4000}
    deploy:
      replicas: 1
      resources:
        limits:
          memory: 8G
          cpus: '4.0'
        reservations:
          memory: 4G
          cpus: '2.0'
    secrets:
      - anthropic_api_key
    volumes:
      - claude_flow_data:/home/claude-user/data
    networks:
      - claude-flow-network

volumes:
  claude_flow_data:
    driver: local

secrets:
  anthropic_api_key:
    external: true

networks:
  claude-flow-network:
    driver: overlay
    ipam:
      config:
        - subnet: 10.1.0.0/24
```

## 🔧 Customization Guide

### Resource Scaling Examples

**Small Environment (4GB RAM, 2 cores):**
```yaml
resources:
  limits:
    memory: 2G
    cpus: '1.5'
  reservations:
    memory: 1G
    cpus: '0.5'
```

**Medium Environment (16GB RAM, 8 cores):**
```yaml
resources:
  limits:
    memory: 8G
    cpus: '4.0'
  reservations:
    memory: 4G
    cpus: '2.0'
```

**Large Environment (32GB RAM, 16 cores):**
```yaml
resources:
  limits:
    memory: 16G
    cpus: '8.0'
  reservations:
    memory: 8G
    cpus: '4.0'
```

### Port Configuration Examples

**Standard Ports:**
```yaml
ports:
  - "4000:3000"  # Web UI
  - "4001:3001"  # API
  - "4080:8080"  # Tools
```

**Custom Ports:**
```yaml
ports:
  - "8000:3000"  # Web UI on port 8000
  - "8001:3001"  # API on port 8001
  - "8080:8080"  # Tools on port 8080
```

**SSL/TLS with Reverse Proxy:**
```yaml
ports:
  - "443:3000"   # HTTPS
  - "80:3000"    # HTTP redirect
```

## 📊 Performance Examples

### High-Performance Configuration

```yaml
# For high-throughput environments
services:
  claude-flow-alpha:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 32G
          cpus: '16.0'
      placement:
        constraints:
          - node.role == worker
          - node.labels.performance == high
    environment:
      - MAX_CONCURRENT_TASKS=50
      - WORKER_POOL_SIZE=20
      - CACHE_SIZE=1000
```

### Memory-Optimized Configuration

```yaml
# For memory-constrained environments
services:
  claude-flow-alpha:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
    environment:
      - NODE_OPTIONS=--max-old-space-size=3072
      - MAX_AGENTS=16
      - CACHE_SIZE=100
```

## 🛠️ Integration Examples

### With Nginx Reverse Proxy

```nginx
# nginx.conf
upstream claude-flow {
    server localhost:4000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://claude-flow;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /ws {
        proxy_pass http://claude-flow;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### With Traefik

```yaml
# traefik labels
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.claude-flow.rule=Host(`claude-flow.local`)"
  - "traefik.http.routers.claude-flow.entrypoints=web"
  - "traefik.http.services.claude-flow.loadbalancer.server.port=3000"
```

### With Docker Compose (Development)

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  claude-flow:
    build: .
    ports:
      - "4000:3000"
    environment:
      - NODE_ENV=development
      - DEBUG=claude-flow:*
    volumes:
      - ./src:/app/src:ro
      - claude_flow_data:/home/claude-user/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - claude-flow

volumes:
  claude_flow_data:
```

## 🔐 Security Examples

### Basic Security Configuration

```yaml
# Security-focused configuration
services:
  claude-flow-alpha:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=1g
    user: "1001:1001"
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

### Network Security

```yaml
# Isolated network configuration
networks:
  claude-flow-internal:
    driver: overlay
    encrypted: true
    internal: true
  claude-flow-external:
    driver: overlay
    encrypted: true
```

## 📈 Monitoring Examples

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'claude-flow'
    static_configs:
      - targets: ['claude-flow:4001']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Claude Flow Metrics",
    "panels": [
      {
        "title": "Active Agents",
        "type": "stat",
        "targets": [
          {
            "expr": "claude_flow_active_agents"
          }
        ]
      },
      {
        "title": "Task Queue",
        "type": "graph", 
        "targets": [
          {
            "expr": "claude_flow_queued_tasks"
          }
        ]
      }
    ]
  }
}
```

## 🧪 Testing Examples

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "Testing Claude Flow deployment..."

# Test API endpoint
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/status)
if [ "$API_STATUS" = "200" ]; then
    echo "✅ API endpoint healthy"
else
    echo "❌ API endpoint failed (status: $API_STATUS)"
    exit 1
fi

# Test WebSocket endpoint
WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Key: test" \
    http://localhost:4000/ws)
if [ "$WS_STATUS" = "101" ]; then
    echo "✅ WebSocket endpoint healthy"
else
    echo "❌ WebSocket endpoint failed (status: $WS_STATUS)"
    exit 1
fi

echo "🎉 All tests passed!"
```

### Load Testing

```bash
# load-test.sh
#!/bin/bash

echo "Running load test..."

# Install artillery if needed
# npm install -g artillery

artillery quick \
    --duration 60 \
    --rate 10 \
    http://localhost:4000/api/status

echo "Load test completed"
```

## 📚 Next Steps

After reviewing the examples:

1. **Choose your deployment type** - Basic, Production, or Development
2. **Customize configuration** - Adjust resources, ports, and settings
3. **Review security settings** - Apply appropriate security measures
4. **Set up monitoring** - Implement monitoring and alerting
5. **Test your deployment** - Use provided testing scripts

## 🔗 Related Documentation

- [Installation Guide](../docs/deployment/installation.md)
- [Configuration Reference](../docs/deployment/configuration.md)
- [Troubleshooting](../docs/troubleshooting/README.md)
- [API Documentation](../docs/api/README.md)

---

**Need a custom example?** Open an [issue](../../issues) or check [discussions](../../discussions).
