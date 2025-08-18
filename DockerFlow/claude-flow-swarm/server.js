const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;

class DockerFlowServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.clients = new Set();
        this.activeProcesses = new Map();
        this.isInitialized = false;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // CORS for development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });
    }

    setupRoutes() {
        // Main UI route
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // API status endpoint
        this.app.get('/api/status', (req, res) => {
            res.json({
                status: 'online',
                version: '1.0.0',
                initialized: this.isInitialized,
                uptime: process.uptime(),
                activeProcesses: this.activeProcesses.size,
                connectedClients: this.clients.size,
                apiKey: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
                claudeFlow: 'available'
            });
        });

        // Test Anthropic API connectivity
        this.app.get('/api/test-anthropic', async (req, res) => {
            try {
                const apiKey = process.env.ANTHROPIC_API_KEY;
                if (!apiKey || apiKey.startsWith('sk-test')) {
                    return res.json({
                        success: false,
                        error: 'No valid Anthropic API key configured',
                        configured: false
                    });
                }

                // Test API with a simple request
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: 'claude-3-haiku-20240307',
                        max_tokens: 10,
                        messages: [
                            {
                                role: 'user',
                                content: 'Test'
                            }
                        ]
                    })
                });

                if (response.ok) {
                    res.json({
                        success: true,
                        message: 'Anthropic API connection successful',
                        configured: true
                    });
                } else {
                    const error = await response.text();
                    res.json({
                        success: false,
                        error: `API error: ${response.status} - ${error}`,
                        configured: true
                    });
                }
            } catch (error) {
                res.json({
                    success: false,
                    error: `Connection error: ${error.message}`,
                    configured: !!process.env.ANTHROPIC_API_KEY
                });
            }
        });

        // Test claude-flow@alpha installation
        this.app.get('/api/test-claude-flow', async (req, res) => {
            try {
                const result = await this.executeShellCommand('cd /workspace && npx claude-flow@alpha --version');
                res.json({
                    success: result.success,
                    version: result.output,
                    installed: result.success
                });
            } catch (error) {
                res.json({
                    success: false,
                    error: error.message,
                    installed: false
                });
            }
        });

        // Command execution endpoint
        this.app.post('/api/execute', async (req, res) => {
            try {
                const { command, type = 'shell', naturalLanguage = false } = req.body;
                
                if (!command) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Command is required' 
                    });
                }

                console.log(`Executing ${type} command: ${command}`);
                
                let actualCommand = command;
                
                // Handle natural language translation
                if (naturalLanguage || (!command.startsWith('npx') && !command.startsWith('npm') && type === 'claude-flow')) {
                    actualCommand = this.translateNaturalLanguage(command);
                    console.log(`Translated to: ${actualCommand}`);
                }
                
                let result;
                if (type === 'claude-flow' || actualCommand.includes('claude-flow')) {
                    result = await this.executeClaudeFlowCommand(actualCommand);
                } else {
                    result = await this.executeShellCommand(actualCommand);
                }
                
                res.json(result);
            } catch (error) {
                console.error('Command execution error:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Agent management endpoints
        this.app.get('/api/agents', (req, res) => {
            res.json({
                agents: Array.from(this.activeProcesses.values())
                    .filter(proc => proc.type === 'agent')
                    .map(proc => ({
                        id: proc.id,
                        name: proc.name,
                        type: proc.agentType,
                        status: proc.status,
                        task: proc.task,
                        startTime: proc.startTime
                    }))
            });
        });

        this.app.post('/api/agents/spawn', async (req, res) => {
            try {
                const { name, type, task } = req.body;
                const command = `npx claude-flow@alpha hive-mind spawn "${task}" --name "${name}" --type ${type} --claude`;
                
                const result = await this.executeClaudeFlowCommand(command);
                res.json(result);
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Logs endpoint
        this.app.get('/api/logs', async (req, res) => {
            try {
                const logs = await this.getSystemLogs();
                res.json({ logs });
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Initialize DockerFlow
        this.app.post('/api/initialize', async (req, res) => {
            try {
                const result = await this.initializeDockerFlow();
                res.json(result);
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            this.clients.add(ws);
            console.log('WebSocket client connected');

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                console.log('WebSocket client disconnected');
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });

            // Send initial status
            this.sendToClient(ws, {
                type: 'system_status',
                status: {
                    initialized: this.isInitialized,
                    version: '1.0.0'
                }
            });
        });
    }

    async executeClaudeFlowCommand(command) {
        return new Promise((resolve) => {
            const processId = this.generateId();
            let output = '';
            let errorOutput = '';

            this.broadcastMessage({
                type: 'command_output',
                source: 'DockerFlow',
                message: `Executing: ${command}`,
                level: 'info'
            });

            // Special handling for initialization
            if (command.includes('init')) {
                return this.handleInitCommand(command, resolve);
            }

            // Ensure we're in the right directory and have proper environment
            const child = spawn('bash', ['-c', `cd /workspace && ${command}`], {
                cwd: '/workspace',
                env: { 
                    ...process.env,
                    NODE_ENV: 'development',
                    SERVICE_NAME: 'dockerflow-service',
                    PATH: '/home/claude-user/.npm-global/bin:/usr/local/bin:/usr/bin:/bin',
                    HOME: '/home/claude-user',
                    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
                },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.activeProcesses.set(processId, {
                id: processId,
                type: 'claude-flow',
                command,
                process: child,
                startTime: new Date(),
                status: 'running'
            });

            child.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                
                // Stream output line by line for better real-time feedback
                const lines = text.split('\n').filter(line => line.trim());
                lines.forEach(line => {
                    this.broadcastMessage({
                        type: 'command_output',
                        source: 'claude-flow',
                        message: line.trim(),
                        level: 'info'
                    });
                });
            });

            child.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                
                // Stream error output line by line
                const lines = text.split('\n').filter(line => line.trim());
                lines.forEach(line => {
                    // Don't treat npm warnings as errors
                    const level = line.includes('npm warn') ? 'warn' : 'error';
                    this.broadcastMessage({
                        type: 'command_output',
                        source: 'claude-flow',
                        message: line.trim(),
                        level: level
                    });
                });
            });

            child.on('close', (code) => {
                this.activeProcesses.delete(processId);
                
                const finalMessage = code === 0 ? 'Command completed successfully' : `Command finished with code ${code}`;
                this.broadcastMessage({
                    type: 'command_output',
                    source: 'DockerFlow',
                    message: finalMessage,
                    level: code === 0 ? 'success' : 'error'
                });
                
                resolve({ 
                    success: code === 0, 
                    output: output || (code === 0 ? 'Command executed successfully' : 'No output'),
                    error: code !== 0 ? (errorOutput || `Command failed with code ${code}`) : null,
                    code 
                });
            });

            child.on('error', (error) => {
                this.activeProcesses.delete(processId);
                this.broadcastMessage({
                    type: 'command_output',
                    source: 'DockerFlow',
                    message: `Process error: ${error.message}`,
                    level: 'error'
                });
                resolve({ 
                    success: false, 
                    error: error.message 
                });
            });
        });
    }

    async handleInitCommand(command, resolve) {
        // Simulate initialization process
        const steps = [
            'Checking Node.js environment...',
            'Installing claude-flow@alpha...',
            'Setting up MCP tools...',
            'Configuring swarm capabilities...',
            'Starting hive-mind coordinator...',
            'Initialization complete!'
        ];

        let stepIndex = 0;
        const stepInterval = setInterval(() => {
            if (stepIndex < steps.length) {
                this.broadcastMessage({
                    type: 'command_output',
                    source: 'Installer',
                    message: steps[stepIndex],
                    level: 'info'
                });
                stepIndex++;
            } else {
                clearInterval(stepInterval);
                this.isInitialized = true;
                
                this.broadcastMessage({
                    type: 'system_status',
                    status: { initialized: true }
                });

                resolve({ 
                    success: true, 
                    output: 'DockerFlow initialized successfully!' 
                });
            }
        }, 1000);
    }

    async executeShellCommand(command) {
        return new Promise((resolve) => {
            const processId = this.generateId();
            let output = '';
            let errorOutput = '';

            const child = spawn('bash', ['-c', command], {
                cwd: '/workspace',
                env: process.env
            });

            this.activeProcesses.set(processId, {
                id: processId,
                type: 'shell',
                command,
                process: child,
                startTime: new Date(),
                status: 'running'
            });

            child.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
            });

            child.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
            });

            child.on('close', (code) => {
                this.activeProcesses.delete(processId);
                
                if (code === 0) {
                    resolve({ 
                        success: true, 
                        output: output || 'Command completed',
                        code 
                    });
                } else {
                    resolve({ 
                        success: false, 
                        error: errorOutput || `Command failed with code ${code}`,
                        output,
                        code 
                    });
                }
            });

            child.on('error', (error) => {
                this.activeProcesses.delete(processId);
                resolve({ 
                    success: false, 
                    error: error.message 
                });
            });
        });
    }

    async initializeDockerFlow() {
        if (this.isInitialized) {
            return { success: true, message: 'Already initialized' };
        }

        try {
            // Create necessary directories
            await this.ensureDirectories();
            
            // Install claude-flow if not present
            const installResult = await this.executeShellCommand('npm list -g @anthropic-ai/claude-code || npm install -g @anthropic-ai/claude-code');
            
            if (!installResult.success) {
                return { success: false, error: 'Failed to install claude-flow dependencies' };
            }

            this.isInitialized = true;
            return { success: true, message: 'DockerFlow initialized successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async ensureDirectories() {
        const dirs = [
            '/workspace/projects',
            '/workspace/data',
            '/workspace/logs',
            '/workspace/shared'
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    async getSystemLogs() {
        try {
            const logFile = '/workspace/logs/dockerflow.log';
            const logs = await fs.readFile(logFile, 'utf8').catch(() => 'No logs available yet');
            return logs.split('\n').slice(-100); // Last 100 lines
        } catch (error) {
            return ['Error reading logs: ' + error.message];
        }
    }

    handleWebSocketMessage(ws, data) {
        console.log('Received WebSocket message:', data);
        
        switch (data.type) {
            case 'execute_command':
                this.executeClaudeFlowCommand(data.command)
                    .then(result => {
                        this.sendToClient(ws, {
                            type: 'command_result',
                            result
                        });
                    });
                break;
                
            case 'get_status':
                this.sendToClient(ws, {
                    type: 'system_status',
                    status: {
                        initialized: this.isInitialized,
                        activeProcesses: this.activeProcesses.size
                    }
                });
                break;
        }
    }

    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    broadcastMessage(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }

    translateNaturalLanguage(input) {
        const lowerInput = input.toLowerCase();
        
        // Simple natural language to command mapping
        const nlMappings = [
            {
                patterns: ['build.*app', 'create.*application', 'develop.*app', 'make.*app'],
                command: (input) => `npx claude-flow@alpha swarm "build application: ${input}" --claude`
            },
            {
                patterns: ['build.*todo', 'create.*todo', 'todo.*app', 'task.*app'],
                command: (input) => `npx claude-flow@alpha swarm "build todo application: ${input}" --claude`
            },
            {
                patterns: ['build.*api', 'create.*api', 'rest.*api', 'api.*server'],
                command: (input) => `npx claude-flow@alpha swarm "build REST API: ${input}" --claude`
            },
            {
                patterns: ['build.*website', 'create.*website', 'web.*site', 'landing.*page'],
                command: (input) => `npx claude-flow@alpha swarm "build website: ${input}" --claude`
            },
            {
                patterns: ['spawn.*agent', 'create.*agent', 'new.*agent'],
                command: (input) => `npx claude-flow@alpha hive-mind spawn "${input}" --claude`
            },
            {
                patterns: ['help', 'what.*can.*do', 'commands'],
                command: () => `npx claude-flow@alpha --help`
            },
            {
                patterns: ['status', 'how.*system', 'check.*system'],
                command: () => `npx claude-flow@alpha status`
            },
            {
                patterns: ['initialize', 'init', 'setup', 'start'],
                command: () => `npx claude-flow@alpha init --force`
            }
        ];

        // Find matching pattern
        for (const mapping of nlMappings) {
            for (const pattern of mapping.patterns) {
                if (new RegExp(pattern, 'i').test(lowerInput)) {
                    return typeof mapping.command === 'function' 
                        ? mapping.command(input) 
                        : mapping.command;
                }
            }
        }

        // Default: treat as a general swarm task
        if (!input.startsWith('npx') && !input.startsWith('npm')) {
            return `npx claude-flow@alpha swarm "${input}" --claude`;
        }

        return input;
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    start(port = 3000) {
        this.server.listen(port, () => {
            console.log(`DockerFlow server running on port ${port}`);
            console.log(`Web UI: http://localhost:${port}`);
            console.log(`WebSocket endpoint: ws://localhost:${port}/ws`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('Shutting down DockerFlow server...');
            this.server.close(() => {
                process.exit(0);
            });
        });
    }
}

// Start the server
const server = new DockerFlowServer();
server.start(process.env.PORT || 3000);
// Force rebuild Mon Aug 18 11:39:44 EDT 2025
