# API Reference

Complete API documentation for Claude Flow v2 Docker Swarm deployment.

## 📡 API Overview

Claude Flow provides both REST and WebSocket APIs for comprehensive interaction with the AI orchestration system.

### Base URLs

- **REST API**: `http://your-server:4001/api/`
- **WebSocket**: `ws://your-server:4000/ws`
- **Health Check**: `http://your-server:4000/api/status`

### Authentication

All API requests require authentication via API key:

```bash
# REST API
curl -H "Authorization: Bearer your-api-key" \
     -H "Content-Type: application/json" \
     http://localhost:4001/api/agents

# WebSocket authentication is handled during connection handshake
```

## 🚀 REST API

### Health and Status

#### GET /api/status
Check system health and basic information.

**Request:**
```bash
curl http://localhost:4000/api/status
```

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime": 3600,
  "services": {
    "agents": "running",
    "websocket": "connected",
    "database": "healthy"
  },
  "metrics": {
    "active_agents": 3,
    "queued_tasks": 7,
    "cpu_usage": 15.2,
    "memory_usage": 2.1
  }
}
```

#### GET /api/info
Get detailed system information.

**Response:**
```json
{
  "system": {
    "node_count": 1,
    "swarm_status": "active",
    "docker_version": "28.0.0"
  },
  "capabilities": {
    "agents": 64,
    "max_concurrent_tasks": 100,
    "supported_protocols": ["json-rpc", "websocket"]
  }
}
```

### Agent Management

#### GET /api/agents
List all available agents.

**Response:**
```json
{
  "agents": [
    {
      "id": "researcher_001",
      "name": "Research Agent",
      "type": "research",
      "status": "active",
      "capabilities": ["web_search", "data_analysis"],
      "current_task": null
    },
    {
      "id": "coder_001", 
      "name": "Code Generator",
      "type": "development",
      "status": "busy",
      "capabilities": ["code_generation", "debugging"],
      "current_task": "generate_api_endpoint"
    }
  ]
}
```

#### GET /api/agents/{agent_id}
Get detailed information about a specific agent.

**Response:**
```json
{
  "id": "researcher_001",
  "name": "Research Agent",
  "type": "research",
  "status": "active",
  "created_at": "2025-01-18T10:00:00Z",
  "last_activity": "2025-01-18T15:30:00Z",
  "capabilities": ["web_search", "data_analysis", "report_generation"],
  "performance_metrics": {
    "tasks_completed": 45,
    "average_response_time": 2.3,
    "success_rate": 0.96
  },
  "current_task": null
}
```

#### POST /api/agents/{agent_id}/tasks
Assign a task to a specific agent.

**Request:**
```json
{
  "task_type": "research",
  "parameters": {
    "query": "Latest developments in AI orchestration",
    "sources": ["academic", "industry"],
    "depth": "comprehensive"
  },
  "priority": "high",
  "timeout": 300
}
```

**Response:**
```json
{
  "task_id": "task_abc123",
  "agent_id": "researcher_001",
  "status": "queued",
  "estimated_completion": "2025-01-18T16:00:00Z",
  "created_at": "2025-01-18T15:30:00Z"
}
```

### Task Management

#### GET /api/tasks
List all tasks in the system.

**Query Parameters:**
- `status`: Filter by status (queued, running, completed, failed)
- `agent_id`: Filter by agent
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset

**Response:**
```json
{
  "tasks": [
    {
      "id": "task_abc123",
      "agent_id": "researcher_001",
      "type": "research",
      "status": "running",
      "progress": 0.65,
      "created_at": "2025-01-18T15:30:00Z",
      "started_at": "2025-01-18T15:31:00Z",
      "estimated_completion": "2025-01-18T16:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

#### GET /api/tasks/{task_id}
Get detailed task information.

**Response:**
```json
{
  "id": "task_abc123",
  "agent_id": "researcher_001",
  "type": "research",
  "status": "completed",
  "progress": 1.0,
  "created_at": "2025-01-18T15:30:00Z",
  "started_at": "2025-01-18T15:31:00Z",
  "completed_at": "2025-01-18T15:45:00Z",
  "parameters": {
    "query": "Latest developments in AI orchestration",
    "sources": ["academic", "industry"]
  },
  "result": {
    "summary": "Comprehensive research report on AI orchestration trends...",
    "sources_found": 15,
    "key_findings": [
      "Multi-agent systems are becoming more sophisticated",
      "Docker orchestration is increasingly popular"
    ],
    "confidence_score": 0.92
  }
}
```

#### DELETE /api/tasks/{task_id}
Cancel a queued or running task.

**Response:**
```json
{
  "message": "Task cancelled successfully",
  "task_id": "task_abc123",
  "previous_status": "running"
}
```

### Swarm Operations

#### GET /api/swarm/nodes
Get information about swarm nodes.

**Response:**
```json
{
  "nodes": [
    {
      "id": "node_123",
      "hostname": "docker-node-1",
      "role": "manager",
      "status": "ready",
      "availability": "active",
      "resources": {
        "cpu_cores": 8,
        "memory_gb": 16,
        "disk_gb": 100
      },
      "usage": {
        "cpu_percent": 25.5,
        "memory_percent": 60.2,
        "disk_percent": 45.0
      }
    }
  ]
}
```

#### POST /api/swarm/scale
Scale the service replicas.

**Request:**
```json
{
  "service": "claude-flow-alpha",
  "replicas": 3
}
```

**Response:**
```json
{
  "message": "Scaling initiated",
  "service": "claude-flow-alpha", 
  "current_replicas": 1,
  "target_replicas": 3,
  "estimated_completion": "2025-01-18T16:05:00Z"
}
```

## 📡 WebSocket API

### Connection

Connect to the WebSocket endpoint for real-time communication:

```javascript
const ws = new WebSocket('ws://localhost:4000/ws');

ws.onopen = function(event) {
    console.log('Connected to Claude Flow WebSocket');
    
    // Send initialization message
    ws.send(JSON.stringify({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": { "major": 2024, "minor": 11, "patch": 5 },
            "clientInfo": { "name": "Claude Flow WebUI", "version": "2.0.0" }
        }
    }));
};
```

### Protocol

The WebSocket API uses **JSON-RPC 2.0** protocol for structured communication.

#### Initialization

**Client → Server:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize", 
  "params": {
    "protocolVersion": { "major": 2024, "minor": 11, "patch": 5 },
    "clientInfo": { "name": "Your Client", "version": "1.0.0" },
    "capabilities": {
      "streaming": true,
      "notifications": true
    }
  }
}
```

**Server → Client:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "serverInfo": { "name": "claude-flow", "version": "2.0.0" },
    "capabilities": {
      "tools": true,
      "streaming": true,
      "agent_management": true
    }
  }
}
```

### Real-time Events

#### Agent Status Updates

**Server → Client:**
```json
{
  "jsonrpc": "2.0",
  "method": "agent/status",
  "params": {
    "agent_id": "researcher_001",
    "status": "active",
    "task": "Analyzing market trends",
    "progress": 0.75,
    "estimated_completion": "2025-01-18T16:00:00Z"
  }
}
```

#### Task Progress Updates

**Server → Client:**
```json
{
  "jsonrpc": "2.0",
  "method": "task/progress",
  "params": {
    "task_id": "task_abc123",
    "agent_id": "researcher_001",
    "progress": 0.85,
    "status": "running",
    "current_step": "Compiling research findings",
    "steps_completed": 8,
    "total_steps": 10
  }
}
```

#### System Metrics

**Server → Client:**
```json
{
  "jsonrpc": "2.0",
  "method": "system/metrics",
  "params": {
    "timestamp": "2025-01-18T15:45:00Z",
    "cpu_usage": 15.2,
    "memory_usage": 2.1,
    "active_agents": 3,
    "queued_tasks": 7,
    "completed_tasks_last_hour": 45
  }
}
```

### Commands

#### Execute Agent Command

**Client → Server:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "agent/execute",
  "params": {
    "agent_id": "coder_001",
    "command": "generate_code",
    "parameters": {
      "language": "python",
      "task": "Create a REST API endpoint",
      "framework": "fastapi"
    }
  }
}
```

**Server → Client:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "task_id": "task_def456",
    "status": "queued",
    "estimated_start": "2025-01-18T15:46:00Z"
  }
}
```

#### Get Agent List

**Client → Server:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "agents/list",
  "params": {
    "filter": {
      "status": "active",
      "type": "development"
    }
  }
}
```

### Error Handling

**Server Error Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "field": "agent_id",
      "reason": "Agent not found"
    }
  }
}
```

**Common Error Codes:**
- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32000`: Agent unavailable
- `-32001`: Task failed
- `-32002`: Resource limit exceeded

## 🔧 SDK and Libraries

### JavaScript/TypeScript

```bash
npm install claude-flow-client
```

```javascript
import { ClaudeFlowClient } from 'claude-flow-client';

const client = new ClaudeFlowClient({
  restUrl: 'http://localhost:4001/api',
  websocketUrl: 'ws://localhost:4000/ws',
  apiKey: 'your-api-key'
});

// REST API usage
const agents = await client.agents.list();
const task = await client.tasks.create('researcher_001', {
  query: 'AI trends 2025'
});

// WebSocket usage
client.on('agent/status', (data) => {
  console.log('Agent update:', data);
});

await client.connect();
```

### Python

```bash
pip install claude-flow-python
```

```python
from claude_flow import ClaudeFlowClient

client = ClaudeFlowClient(
    rest_url='http://localhost:4001/api',
    websocket_url='ws://localhost:4000/ws',
    api_key='your-api-key'
)

# REST API usage
agents = client.agents.list()
task = client.tasks.create('researcher_001', {
    'query': 'AI trends 2025'
})

# WebSocket usage
@client.on('agent/status')
def on_agent_status(data):
    print(f"Agent update: {data}")

client.connect()
```

## 📚 Related Documentation

- [WebSocket API Details](websocket.md) - Detailed WebSocket protocol
- [Authentication Guide](authentication.md) - API authentication methods
- [API Examples](examples.md) - Practical usage examples
- [Troubleshooting](../troubleshooting/README.md) - Common API issues

---

**Need help?** Check the [examples](examples.md) or open an [issue](../../issues).
