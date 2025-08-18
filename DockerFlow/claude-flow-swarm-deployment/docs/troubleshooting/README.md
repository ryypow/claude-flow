# Troubleshooting Guide

Common issues and solutions for Claude Flow v2 Docker Swarm deployment.

## 🚨 Quick Fixes

### WebSocket Shows "Disconnected"

**Symptoms:**
- WebUI shows "Disconnected" status
- WebSocket connection fails
- Real-time updates not working

**Quick Diagnosis:**
```bash
# 1. Check service status
./swarm-manage.sh status

# 2. Test API endpoint
curl -v http://localhost:4000/api/status

# 3. Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:4000/ws
```

**Solutions:**
```bash
# Solution 1: Restart service
./swarm-manage.sh update

# Solution 2: Check port configuration
ss -tlnp | grep 4000

# Solution 3: Verify WebSocket URL in settings
# Edit settings.js to use correct IP address
```

### Port Conflicts

**Symptoms:**
- "Port already in use" errors
- Service fails to start
- Cannot access web interface

**Diagnosis:**
```bash
# Check what's using the ports
ss -tlnp | grep -E ':(4000|4001|4080)'
netstat -tlnp | grep -E ':(4000|4001|4080)'

# Check Docker port mappings
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

**Solutions:**
```bash
# Solution 1: Stop conflicting services
sudo systemctl stop service-name
# or kill specific process
sudo kill -9 PID

# Solution 2: Change ports in configuration
vim docker-stack.yml
# Update port mappings, then redeploy
./swarm-manage.sh deploy

# Solution 3: Use different ports
# Edit docker-stack.yml ports section:
ports:
  - target: 3000
    published: 5000  # Changed from 4000
    protocol: tcp
```

### Service Won't Start

**Symptoms:**
- Service stuck in "Starting" state
- Container exits immediately
- Health checks failing

**Diagnosis:**
```bash
# Check service status
docker service ls
docker service ps claude-flow_claude-flow-alpha

# Check logs
./swarm-manage.sh logs

# Check container status
docker ps -a | grep claude-flow
```

**Solutions:**
```bash
# Solution 1: Check API key secret
docker secret ls | grep anthropic
# Recreate if missing:
echo 'your-api-key' | docker secret create anthropic_api_key -

# Solution 2: Check resource availability
docker stats
# Reduce resource limits in docker-stack.yml if needed

# Solution 3: Clean restart
./swarm-manage.sh remove
./swarm-manage.sh deploy
```

## 🔍 Detailed Troubleshooting

### Docker and Swarm Issues

#### Docker Swarm Not Initialized

**Error:** `This node is not a swarm manager`

**Solution:**
```bash
# Initialize swarm
docker swarm init

# If multiple network interfaces, specify IP:
docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')

# Verify initialization
docker node ls
```

#### Swarm Network Issues

**Symptoms:**
- Services can't communicate
- Network overlay problems
- DNS resolution failures

**Diagnosis:**
```bash
# Check networks
docker network ls | grep claude

# Inspect network details
docker network inspect claude-flow-network

# Test service connectivity
docker exec -it $(docker ps -q) nslookup claude-flow-alpha
```

**Solutions:**
```bash
# Recreate network
docker network rm claude-flow-network
./swarm-manage.sh deploy

# Or manually create with correct settings
docker network create \
  --driver overlay \
  --subnet 10.1.0.0/24 \
  --attachable \
  claude-flow-network
```

#### Resource Constraints

**Symptoms:**
- Out of memory errors
- CPU throttling
- Slow performance

**Diagnosis:**
```bash
# Check resource usage
docker stats
free -h
top

# Check service resource limits
docker service inspect claude-flow_claude-flow-alpha
```

**Solutions:**
```bash
# Adjust resource limits in docker-stack.yml
resources:
  limits:
    memory: 8G    # Reduced from 16G
    cpus: '4.0'   # Reduced from 8.0
  reservations:
    memory: 4G
    cpus: '2.0'

# Redeploy with new limits
./swarm-manage.sh deploy
```

### Application Issues

#### Claude Flow Initialization Failures

**Symptoms:**
- Init-alpha command fails
- Agent setup incomplete
- Missing Claude Flow features

**Diagnosis:**
```bash
# Check initialization logs
./swarm-manage.sh logs | grep -i init

# Test inside container
./swarm-manage.sh shell
npx claude-flow@alpha --version
```

**Solutions:**
```bash
# Solution 1: Manual initialization
./swarm-manage.sh shell
cd /home/claude-user
npx claude-flow@alpha init

# Solution 2: Verify API key
echo $ANTHROPIC_API_KEY
# Should show your API key

# Solution 3: Clean installation
./swarm-manage.sh remove
docker image rm claude-flow-alpha:latest
./swarm-manage.sh build
./swarm-manage.sh deploy
```

#### WebSocket Connection Problems

**Common WebSocket Errors:**

**Error 1:** `WebSocket connection to 'ws://localhost:4000/ws' failed`
```bash
# Check if service is running
curl http://localhost:4000/api/status

# Verify WebSocket endpoint
curl -v --http1.1 \
     -H "Upgrade: websocket" \
     -H "Connection: Upgrade" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:4000/ws
```

**Error 2:** `Connection refused`
```bash
# Check port mapping
docker port $(docker ps -q --filter ancestor=claude-flow-alpha)

# Check internal service
docker exec -it $(docker ps -q) netstat -tlnp | grep 4000
```

**Error 3:** `Unexpected response code: 400`
```bash
# Check WebSocket configuration
./swarm-manage.sh shell
cat /app/settings.js | grep serverUrl

# Should be: serverUrl: 'ws://YOUR_IP:4000/ws'
```

### Performance Issues

#### High CPU Usage

**Diagnosis:**
```bash
# Monitor CPU usage
top -p $(docker inspect --format '{{.State.Pid}}' $(docker ps -q))

# Check Claude Flow processes
./swarm-manage.sh shell
ps aux | grep claude-flow
```

**Solutions:**
```bash
# 1. Reduce concurrent agents
# Edit configuration to limit active agents

# 2. Adjust CPU limits
# In docker-stack.yml:
resources:
  limits:
    cpus: '4.0'  # Adjust based on available cores

# 3. Monitor and tune
./swarm-manage.sh logs | grep -i cpu
```

#### Memory Leaks

**Symptoms:**
- Continuously increasing memory usage
- Out of memory kills
- Slow response times

**Diagnosis:**
```bash
# Monitor memory usage over time
while true; do 
  docker stats --no-stream | grep claude-flow
  sleep 60
done

# Check for memory leaks in container
./swarm-manage.sh shell
free -h
ps aux --sort=-%mem | head -10
```

**Solutions:**
```bash
# 1. Restart service periodically
# Add to crontab:
# 0 2 * * * /path/to/swarm-manage.sh update

# 2. Reduce memory limits to force garbage collection
resources:
  limits:
    memory: 8G  # Force more aggressive GC

# 3. Enable memory debugging
# Set NODE_OPTIONS in docker-stack.yml:
environment:
  - NODE_OPTIONS=--max-old-space-size=4096
```

### Network and Connectivity

#### External Access Issues

**Problem:** Cannot access from other machines

**Solution:**
```bash
# 1. Check firewall
sudo ufw status
sudo firewall-cmd --list-ports

# 2. Bind to all interfaces
# In docker-stack.yml, ensure ports are published correctly:
ports:
  - target: 3000
    published: 4000
    protocol: tcp
    mode: ingress  # Important for external access

# 3. Update WebSocket URL for external access
# Edit settings.js:
serverUrl: 'ws://YOUR_EXTERNAL_IP:4000/ws'
```

#### DNS Resolution Problems

**Symptoms:**
- Service discovery failures
- Cannot resolve service names
- Network connectivity issues

**Diagnosis:**
```bash
# Test DNS resolution
./swarm-manage.sh shell
nslookup claude-flow-alpha
dig claude-flow-alpha

# Check swarm DNS
docker exec -it $(docker ps -q) cat /etc/resolv.conf
```

**Solutions:**
```bash
# Restart Docker daemon
sudo systemctl restart docker

# Or recreate the network
docker network rm claude-flow-network
./swarm-manage.sh deploy
```

## 🔧 Advanced Debugging

### Debug Mode

**Enable comprehensive debugging:**
```bash
# Set debug environment variables
export DEBUG=claude-flow:*
export LOG_LEVEL=debug

# Deploy with debug mode
./swarm-manage.sh deploy

# Monitor debug logs
./swarm-manage.sh logs -f | grep DEBUG
```

### Container Inspection

**Detailed container analysis:**
```bash
# Get container details
docker inspect $(docker ps -q --filter ancestor=claude-flow-alpha)

# Check container filesystem
./swarm-manage.sh shell
ls -la /app/
ls -la /home/claude-user/

# Check environment variables
env | grep -E '(CLAUDE|API|PORT)'

# Check running processes
ps aux
systemctl status # if systemd is available
```

### Network Debugging

**Advanced network troubleshooting:**
```bash
# Trace network traffic
sudo tcpdump -i any port 4000

# Test connectivity from different networks
# From host:
curl localhost:4000/api/status
# From another container:
docker run --rm --network claude-flow-network alpine \
  wget -qO- http://claude-flow-alpha:3000/api/status
```

## 📋 Diagnostic Script

**Create a comprehensive diagnostic script:**

```bash
#!/bin/bash
# save as diagnose.sh

echo "=== Claude Flow Diagnostic Report ==="
echo "Date: $(date)"
echo

echo "=== System Information ==="
uname -a
docker --version
docker info | grep -E "(Swarm|CPUs|Total Memory)"
echo

echo "=== Service Status ==="
docker service ls
docker service ps claude-flow_claude-flow-alpha
echo

echo "=== Port Status ==="
ss -tlnp | grep -E ':(4000|4001|4080)'
echo

echo "=== Container Status ==="
docker ps | grep claude-flow
echo

echo "=== Network Status ==="
docker network ls | grep claude
echo

echo "=== Recent Logs ==="
docker service logs --tail 50 claude-flow_claude-flow-alpha
echo

echo "=== Resource Usage ==="
docker stats --no-stream | grep claude-flow
echo

echo "=== Secrets ==="
docker secret ls | grep anthropic
echo

echo "=== Connectivity Test ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/status
echo " <- API Status Response Code"
```

**Run diagnostics:**
```bash
chmod +x diagnose.sh
./diagnose.sh > diagnostic-report.txt
```

## 🆘 Getting Help

### Before Opening an Issue

1. **Run diagnostics:**
   ```bash
   ./diagnose.sh > diagnostic-report.txt
   ```

2. **Check existing issues:**
   - Search [GitHub issues](../../issues)
   - Check [discussions](../../discussions)

3. **Gather information:**
   - OS and Docker version
   - Complete error messages
   - Steps to reproduce
   - Configuration files (sanitized)

### Creating a Bug Report

Include in your issue:

```markdown
## Environment
- OS: Ubuntu 22.04
- Docker: 28.0.0
- Memory: 16GB
- CPU: 8 cores

## Problem Description
[Clear description of the issue]

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Logs
```
[Paste relevant logs here]
```

## Additional Context
[Any other relevant information]
```

### Emergency Procedures

**If system is completely unresponsive:**

```bash
# Nuclear option - complete cleanup
docker swarm leave --force
docker system prune -a --volumes
docker swarm init
# Then redeploy from scratch
```

**If data recovery is needed:**
```bash
# Backup volumes before cleanup
docker run --rm -v claude_flow_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz /data
```

---

**Still need help?** Join our [community discussions](../../discussions) or [open an issue](../../issues/new).
