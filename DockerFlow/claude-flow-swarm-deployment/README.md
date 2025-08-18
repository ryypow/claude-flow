# Claude Flow v2 Docker Swarm Deployment

<div align="center">

![Claude Flow Banner](assets/images/claude-flow-banner.png)

[![Docker](https://img.shields.io/badge/Docker-v28.0+-blue?logo=docker)](https://www.docker.com/)
[![Docker Swarm](https://img.shields.io/badge/Docker%20Swarm-Enabled-blue?logo=docker)](https://docs.docker.com/engine/swarm/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-v2.0.0-brightgreen)](CHANGELOG.md)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-orange.svg)](CONTRIBUTING.md)
[![Documentation](https://img.shields.io/badge/Documentation-Complete-blue)](docs/)

**Production-ready Docker Swarm deployment for Claude Flow v2 with comprehensive features, WebUI, and enterprise-grade orchestration**

[🚀 Quick Start](#quick-start) • [📖 Documentation](docs/) • [💡 Examples](examples/) • [🐛 Issues](../../issues) • [🤝 Contributing](CONTRIBUTING.md)

</div>

---

## 🌟 Features

- **🐳 Docker Swarm Ready**: Full production deployment with scaling and load balancing
- **🌐 Web Interface**: Modern browser-based UI with real-time WebSocket communication
- **🧠 AI Orchestration**: Complete Claude Flow v2 with 64+ specialized agents
- **📊 Real-time Monitoring**: WebSocket-based activity monitoring and status updates
- **🔧 Enterprise Features**: Health checks, auto-restart, rolling updates, and rollback
- **🛡️ Security**: Docker secrets integration, non-root execution, network isolation
- **📈 Scalable**: Horizontal scaling with automatic load balancing
- **⚡ High Performance**: Optimized for 14-core, 32GB systems with resource limits
- **🔄 Zero Downtime**: Rolling updates and health-based deployments
- **📱 Multi-Platform**: Linux, Windows, macOS support with WSL2

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Swarm Cluster                     │
├─────────────────────────────────────────────────────────────┤
│  Claude Flow Service (Replicated)                          │
│  ├── Web UI (Port 4000)         ┌─────────────────────────┐ │
│  ├── API Server (Port 4001)     │     External Access     │ │
│  ├── WebSocket Server           │  http://host:4000/      │ │
│  └── Tools API (Port 4080)      │  ws://host:4000/ws      │ │
├─────────────────────────────────────────────────────────────┤
│  Persistent Storage                                         │
│  ├── claude_flow_data          (Application data)          │
│  ├── claude_flow_config        (Configuration files)       │
│  ├── claude_projects           (Development projects)      │
│  └── claude_logs               (Centralized logging)       │
├─────────────────────────────────────────────────────────────┤
│  Networking                                                 │
│  ├── Overlay Network (10.1.0.0/24)                        │
│  ├── Service Discovery                                     │
│  └── Load Balancing                                        │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Docker Engine**: v28.0+ with Swarm mode enabled
- **System Requirements**: 8GB RAM minimum (16GB recommended), 4+ CPU cores
- **Network**: Ports 4000, 4001, 4080 available
- **Operating System**: Linux, Windows 10/11 with WSL2, or macOS

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-flow-swarm-deployment.git
cd claude-flow-swarm-deployment

# Initialize Docker Swarm (if not already done)
docker swarm init

# Create API key secret
echo 'your-anthropic-api-key' | docker secret create anthropic_api_key -
```

### 2. Build and Deploy

```bash
# Build the optimized image (15-20 minutes first time)
./swarm-manage.sh build

# Deploy to swarm
./swarm-manage.sh deploy

# Check deployment status
./swarm-manage.sh status
```

### 3. Initialize Claude Flow

```bash
# Initialize the system
./swarm-manage.sh init-alpha

# Access the Web UI
open http://localhost:4000/console
```

## 📊 WebUI and WebSocket Integration

### Web Interface Access

The Claude Flow deployment provides a comprehensive web interface accessible at:

- **Main UI**: `http://your-server-ip:4000/console/`
- **API Endpoints**: `http://your-server-ip:4001/api/`
- **WebSocket**: `ws://your-server-ip:4000/ws`

### Real-time WebSocket Communication

The WebSocket server provides real-time bidirectional communication for:

#### 🔄 **Connection Management**
- Automatic connection establishment and reconnection
- Health monitoring with ping/pong heartbeat
- Connection status updates in the UI

#### 📡 **Activity Monitoring**
```javascript
// The WebSocket streams real-time events:
{
  "jsonrpc": "2.0",
  "method": "agent/status",
  "params": {
    "agent_id": "researcher_001",
    "status": "active",
    "task": "Data analysis",
    "progress": 0.75
  }
}
```

#### 🎯 **Command Execution**
- Execute Claude Flow commands through the WebSocket
- Real-time command output streaming
- Interactive command sessions

#### 📊 **System Metrics**
```javascript
// Live system metrics via WebSocket:
{
  "jsonrpc": "2.0",
  "method": "system/metrics",
  "params": {
    "cpu_usage": 15.2,
    "memory_usage": 2.1,
    "active_agents": 3,
    "queued_tasks": 7
  }
}
```

### WebSocket Protocol

The implementation uses **JSON-RPC 2.0** over WebSocket for structured communication:

```javascript
// Client initialization
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": { "major": 2024, "minor": 11, "patch": 5 },
    "clientInfo": { "name": "Claude Flow WebUI", "version": "2.0.0" }
  }
}

// Server response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "serverInfo": { "name": "claude-flow", "version": "2.0.0" },
    "capabilities": { "tools": true, "streaming": true }
  }
}
```

## 🛠️ Management Commands

### Service Management
```bash
./swarm-manage.sh build       # Build/rebuild image
./swarm-manage.sh deploy      # Deploy or update stack
./swarm-manage.sh remove      # Remove entire stack
./swarm-manage.sh update      # Force service update
```

### Monitoring & Debugging
```bash
./swarm-manage.sh status      # Service status and health
./swarm-manage.sh logs        # Real-time service logs
./swarm-manage.sh shell       # Access container shell
./swarm-manage.sh network     # Network information
```

### Scaling Operations
```bash
./swarm-manage.sh scale 3     # Scale to 3 replicas
./swarm-manage.sh nodes       # Show swarm nodes
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Installation Guide](docs/deployment/installation.md) | Detailed setup instructions |
| [Configuration](docs/deployment/configuration.md) | Advanced configuration options |
| [API Reference](docs/api/README.md) | Complete API documentation |
| [Architecture](docs/architecture/README.md) | System design and components |
| [Troubleshooting](docs/troubleshooting/README.md) | Common issues and solutions |
| [Security](docs/deployment/security.md) | Security best practices |
| [Performance](docs/deployment/performance.md) | Optimization and tuning |

## 🎯 Use Cases

- **AI Development**: Multi-agent orchestration for complex AI workflows
- **Microservices**: Scalable service mesh with intelligent coordination
- **Data Processing**: Distributed task processing with agent collaboration
- **Research**: Collaborative AI research with swarm intelligence
- **DevOps**: Intelligent deployment and monitoring automation

## 🔧 Configuration

### Environment Variables
```yaml
environment:
  - NODE_ENV=production
  - API_PORT=4000
  - WEBSOCKET_PORT=4000
  - UI_PORT=4001
  - LOG_LEVEL=info
```

### Resource Limits
```yaml
resources:
  limits:
    memory: 16G
    cpus: '8.0'
  reservations:
    memory: 8G
    cpus: '4.0'
```

## 🚨 Troubleshooting

### Common Issues

**WebSocket shows "Disconnected"**
```bash
# Check service status
./swarm-manage.sh status

# Verify WebSocket endpoint
curl -v http://localhost:4000/api/status

# Check logs
./swarm-manage.sh logs
```

**Port conflicts**
```bash
# Check port usage
ss -tlnp | grep -E ':(4000|4001|4080)'

# Update ports in docker-stack.yml if needed
```

**Service won't start**
```bash
# Check swarm status
docker node ls

# Verify API key secret
docker secret ls

# Check resource availability
docker stats
```

See [Troubleshooting Guide](docs/troubleshooting/README.md) for detailed solutions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contributing Steps
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Claude AI** by Anthropic for the underlying AI capabilities
- **Docker** team for containerization platform
- **Claude Flow** project for the orchestration framework
- All contributors and community members

## 📈 Status

- ✅ **Stable**: Production-ready deployment
- ✅ **Active Development**: Regular updates and improvements
- ✅ **Community Driven**: Open to contributions and feedback
- ✅ **Well Documented**: Comprehensive guides and examples

## 🔗 Links

- [Documentation](docs/)
- [Examples](examples/)
- [Issue Tracker](../../issues)
- [Discussions](../../discussions)
- [Wiki](../../wiki)

---

<div align="center">

**⭐ Star this repository if it helped you!**

Made with ❤️ for the AI development community

</div>
