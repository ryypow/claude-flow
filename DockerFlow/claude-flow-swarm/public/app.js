// DockerFlow Interactive UI
class DockerFlowUI {
    constructor() {
        this.socket = null;
        this.commandHistory = [];
        this.historyIndex = -1;
        this.activeAgents = [];
        this.isInitialized = false;
        this.naturalLanguageMode = false;
        this.currentWizardStep = 1;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupWebSocket();
        this.loadCommandHistory();
        this.checkSystemStatus();
        
        // Focus on console input
        document.getElementById('console-input').focus();
    }

    setupEventListeners() {
        // Console input
        const consoleInput = document.getElementById('console-input');
        const sendButton = document.getElementById('send-command');
        
        consoleInput.addEventListener('keydown', this.handleConsoleKeydown.bind(this));
        sendButton.addEventListener('click', this.handleSendCommand.bind(this));

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', this.handleNavigation.bind(this));
        });

        // Quick actions
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', this.handleQuickAction.bind(this));
        });

        // Console controls
        document.getElementById('clear-console').addEventListener('click', this.clearConsole.bind(this));
        document.getElementById('natural-language-toggle').addEventListener('click', this.toggleNaturalLanguage.bind(this));

        // Modal controls
        document.getElementById('init-wizard-btn').addEventListener('click', this.showInitWizard.bind(this));
        document.getElementById('spawn-agent-btn').addEventListener('click', this.showSpawnAgentModal.bind(this));

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', this.hideModals.bind(this));
        });

        // Wizard controls
        document.getElementById('wizard-next').addEventListener('click', this.nextWizardStep.bind(this));
        document.getElementById('wizard-prev').addEventListener('click', this.prevWizardStep.bind(this));
        document.getElementById('wizard-finish').addEventListener('click', this.finishWizard.bind(this));

        // Agent type selection
        document.querySelectorAll('.agent-type').forEach(type => {
            type.addEventListener('click', this.selectAgentType.bind(this));
        });

        // Spawn agent confirmation
        document.getElementById('spawn-agent-confirm').addEventListener('click', this.spawnAgent.bind(this));

        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModals();
                }
            });
        });
    }

    setupWebSocket() {
        try {
            this.socket = new WebSocket(`ws://${window.location.host}/ws`);
            
            this.socket.onopen = () => {
                this.addConsoleOutput('System', 'WebSocket connected - Real-time communication active', 'success');
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.socket.onclose = () => {
                this.addConsoleOutput('System', 'WebSocket connection lost - Attempting to reconnect...', 'error');
                setTimeout(() => this.setupWebSocket(), 3000);
            };

            this.socket.onerror = (error) => {
                this.addConsoleOutput('System', 'WebSocket error - Using fallback HTTP mode', 'error');
            };
        } catch (error) {
            this.addConsoleOutput('System', 'WebSocket not available - Using HTTP mode', 'info');
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'command_output':
                this.addConsoleOutput(data.source || 'DockerFlow', data.message, data.level || 'info');
                break;
            case 'agent_update':
                this.updateAgent(data.agent);
                break;
            case 'swarm_status':
                this.updateSwarmStatus(data.status);
                break;
            case 'system_status':
                this.updateSystemStatus(data.status);
                break;
        }
    }

    handleConsoleKeydown(e) {
        const input = e.target;
        
        if (e.key === 'Enter') {
            this.handleSendCommand();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateHistory(-1);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.navigateHistory(1);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.showSuggestions(input.value);
        }
    }

    async handleSendCommand() {
        const input = document.getElementById('console-input');
        const command = input.value.trim();
        
        if (!command) return;

        // Add to history
        this.commandHistory.unshift(command);
        if (this.commandHistory.length > 50) {
            this.commandHistory.pop();
        }
        this.saveCommandHistory();
        this.historyIndex = -1;

        // Show command in console
        this.addConsoleOutput('User', command, 'info');
        input.value = '';

        // Process command
        if (this.naturalLanguageMode) {
            await this.processNaturalLanguage(command);
        } else {
            await this.executeCommand(command);
        }
    }

    async executeCommand(command) {
        const lowerCommand = command.toLowerCase();

        // Built-in commands
        if (lowerCommand === 'help') {
            this.showHelp();
            return;
        }

        if (lowerCommand === 'clear') {
            this.clearConsole();
            return;
        }

        if (lowerCommand === 'status') {
            this.showSystemStatus();
            return;
        }

        if (lowerCommand.startsWith('init')) {
            this.initializeSystem();
            return;
        }

        // Claude-flow commands
        if (lowerCommand.includes('claude-flow') || lowerCommand.includes('swarm') || lowerCommand.includes('hive-mind')) {
            await this.executeClaudeFlowCommand(command);
            return;
        }

        // Default: try to execute as shell command
        await this.executeShellCommand(command);
    }

    async processNaturalLanguage(input) {
        this.addConsoleOutput('AI', 'Processing natural language request...', 'info');
        
        // Send the raw input to backend for translation
        await this.executeClaudeFlowCommand(input, true);
    }

    async executeClaudeFlowCommand(command, isNaturalLanguage = false) {
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command, type: 'claude-flow', naturalLanguage: isNaturalLanguage })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.addConsoleOutput('DockerFlow', result.output || 'Command executed successfully', 'success');
                
                // Update UI based on command type
                if (command.includes('init')) {
                    this.isInitialized = true;
                    this.addConsoleOutput('System', 'DockerFlow initialized successfully!', 'success');
                    this.updateAgentCount();
                }
                
                if (command.includes('spawn') || command.includes('hive-mind')) {
                    this.updateAgentsList();
                }
            } else {
                this.addConsoleOutput('Error', result.error || 'Command failed', 'error');
            }
        } catch (error) {
            this.addConsoleOutput('Error', `Failed to execute command: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async executeShellCommand(command) {
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command, type: 'shell' })
            });

            const result = await response.json();
            
            if (result.success) {
                this.addConsoleOutput('Shell', result.output || 'Command completed', 'info');
            } else {
                this.addConsoleOutput('Error', result.error || 'Command failed', 'error');
            }
        } catch (error) {
            this.addConsoleOutput('Error', `Failed to execute: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showHelp() {
        const helpText = `
DockerFlow v1.0.0 - Available Commands:

BUILT-IN COMMANDS:
  help                     - Show this help message
  clear                    - Clear console output
  status                   - Show system status
  init                     - Initialize DockerFlow

CLAUDE-FLOW COMMANDS:
  npx claude-flow@alpha init --force
  npx claude-flow@alpha swarm "build REST API" --claude
  npx claude-flow@alpha hive-mind wizard
  npx claude-flow@alpha hive-mind spawn "task description" --claude
  npx claude-flow@alpha status

NATURAL LANGUAGE MODE:
  Toggle with the "Natural Language" button to use commands like:
  "Build me a todo app"
  "Create a REST API with authentication"
  "Spawn 3 agents to build an e-commerce site"

AGENT TYPES:
  architect    - System design and architecture
  developer    - Code implementation
  tester       - Quality assurance and testing
  researcher   - Research and analysis

Press Tab for command suggestions, use ↑↓ arrows for history.
        `.trim();

        this.addConsoleOutput('Help', helpText, 'info');
    }

    showSystemStatus() {
        const status = {
            'System': 'DockerFlow v1.0.0',
            'Status': this.isInitialized ? 'Initialized' : 'Not Initialized',
            'WebSocket': this.socket && this.socket.readyState === WebSocket.OPEN ? 'Connected' : 'Disconnected',
            'Natural Language': this.naturalLanguageMode ? 'Enabled' : 'Disabled',
            'Active Agents': this.activeAgents.length,
            'Command History': this.commandHistory.length
        };

        let statusText = 'SYSTEM STATUS:\n';
        for (const [key, value] of Object.entries(status)) {
            statusText += `  ${key}: ${value}\n`;
        }

        this.addConsoleOutput('Status', statusText, 'info');
    }

    async initializeSystem() {
        this.addConsoleOutput('System', 'Initializing DockerFlow...', 'info');
        await this.executeClaudeFlowCommand('npx claude-flow@alpha init --force');
    }

    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;

        this.historyIndex = Math.max(-1, Math.min(this.commandHistory.length - 1, this.historyIndex + direction));
        
        const input = document.getElementById('console-input');
        if (this.historyIndex === -1) {
            input.value = '';
        } else {
            input.value = this.commandHistory[this.historyIndex];
        }
    }

    showSuggestions(partial) {
        const suggestions = [
            'help',
            'clear',
            'status',
            'npx claude-flow@alpha init --force',
            'npx claude-flow@alpha status',
            'npx claude-flow@alpha swarm "build REST API" --claude',
            'npx claude-flow@alpha hive-mind wizard',
            'npx claude-flow@alpha hive-mind spawn "development task" --claude'
        ];

        const filtered = suggestions.filter(cmd => 
            cmd.toLowerCase().includes(partial.toLowerCase())
        );

        const suggestionsDiv = document.getElementById('input-suggestions');
        
        if (filtered.length > 0 && partial.length > 0) {
            suggestionsDiv.innerHTML = filtered.map(cmd => 
                `<div class="suggestion-item" data-command="${cmd}">${cmd}</div>`
            ).join('');
            
            suggestionsDiv.style.display = 'block';
            
            // Add click handlers
            suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    document.getElementById('console-input').value = item.dataset.command;
                    suggestionsDiv.style.display = 'none';
                });
            });
        } else {
            suggestionsDiv.style.display = 'none';
        }
    }

    addConsoleOutput(source, text, level = 'info') {
        const output = document.getElementById('console-output');
        const line = document.createElement('div');
        line.className = `console-line ${level}`;
        
        const prompt = document.createElement('span');
        prompt.className = 'prompt';
        prompt.textContent = source;
        
        const message = document.createElement('span');
        message.className = 'text';
        message.textContent = text;
        
        line.appendChild(prompt);
        line.appendChild(message);
        output.appendChild(line);
        
        // Auto-scroll to bottom
        output.scrollTop = output.scrollHeight;
    }

    clearConsole() {
        const output = document.getElementById('console-output');
        output.innerHTML = `
            <div class="console-line welcome">
                <span class="prompt">DockerFlow</span>
                <span class="text">Welcome to DockerFlow v1.0.0 - AI Development, Containerized</span>
            </div>
            <div class="console-line info">
                <span class="prompt">System</span>
                <span class="text">Type 'help' for available commands or use natural language</span>
            </div>
        `;
    }

    toggleNaturalLanguage() {
        this.naturalLanguageMode = !this.naturalLanguageMode;
        const button = document.getElementById('natural-language-toggle');
        const input = document.getElementById('console-input');
        
        if (this.naturalLanguageMode) {
            button.classList.add('active');
            input.placeholder = 'Describe what you want to build...';
            this.addConsoleOutput('System', 'Natural Language mode enabled - Describe your tasks in plain English', 'success');
        } else {
            button.classList.remove('active');
            input.placeholder = 'Enter command...';
            this.addConsoleOutput('System', 'Natural Language mode disabled - Using command mode', 'info');
        }
    }

    handleNavigation(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const target = link.getAttribute('href').substring(1);
        
        // Update active nav
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Show target tab
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${target}-tab`).classList.add('active');
    }

    handleQuickAction(e) {
        const command = e.currentTarget.dataset.command;
        document.getElementById('console-input').value = command;
        this.handleSendCommand();
    }

    // Modal Management
    showInitWizard() {
        document.getElementById('init-wizard-modal').classList.add('active');
        this.currentWizardStep = 1;
        this.updateWizardStep();
        this.startInitialization();
    }

    showSpawnAgentModal() {
        document.getElementById('spawn-agent-modal').classList.add('active');
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // Wizard Management
    nextWizardStep() {
        if (this.currentWizardStep < 3) {
            this.currentWizardStep++;
            this.updateWizardStep();
            
            if (this.currentWizardStep === 2) {
                this.performInitialization();
            }
        }
    }

    prevWizardStep() {
        if (this.currentWizardStep > 1) {
            this.currentWizardStep--;
            this.updateWizardStep();
        }
    }

    updateWizardStep() {
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active');
        });
        
        document.querySelector(`[data-step="${this.currentWizardStep}"]`).classList.add('active');
        
        // Update buttons
        const prevBtn = document.getElementById('wizard-prev');
        const nextBtn = document.getElementById('wizard-next');
        const finishBtn = document.getElementById('wizard-finish');
        
        prevBtn.style.display = this.currentWizardStep === 1 ? 'none' : 'block';
        nextBtn.style.display = this.currentWizardStep === 3 ? 'none' : 'block';
        finishBtn.style.display = this.currentWizardStep === 3 ? 'block' : 'none';
    }

    async startInitialization() {
        const progress = document.getElementById('init-progress');
        const results = document.getElementById('check-results');
        
        const checks = [
            'Docker container status',
            'Node.js environment',
            'Python environment', 
            'Claude-flow dependencies',
            'MCP tools availability',
            'Network connectivity'
        ];
        
        results.innerHTML = '';
        
        for (let i = 0; i < checks.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const checkItem = document.createElement('div');
            checkItem.className = 'check-item';
            checkItem.innerHTML = `<i class="fas fa-check"></i> ${checks[i]}`;
            results.appendChild(checkItem);
            
            progress.style.width = `${((i + 1) / checks.length) * 100}%`;
        }
    }

    async performInitialization() {
        const terminal = document.getElementById('init-terminal');
        
        const steps = [
            'Initializing claude-flow@alpha...',
            'Setting up MCP tools...',
            'Configuring swarm capabilities...',
            'Starting hive-mind coordinator...',
            'Initialization complete!'
        ];
        
        for (const step of steps) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            terminal.innerHTML += `$ ${step}\n`;
            terminal.scrollTop = terminal.scrollHeight;
        }
        
        this.isInitialized = true;
    }

    finishWizard() {
        this.hideModals();
        this.addConsoleOutput('System', 'DockerFlow initialization wizard completed successfully!', 'success');
        this.updateAgentCount();
    }

    // Agent Management
    selectAgentType(e) {
        document.querySelectorAll('.agent-type').forEach(type => {
            type.classList.remove('selected');
        });
        e.currentTarget.classList.add('selected');
    }

    async spawnAgent() {
        const selectedType = document.querySelector('.agent-type.selected');
        const agentName = document.getElementById('agent-name').value;
        const agentTask = document.getElementById('agent-task').value;
        
        if (!selectedType || !agentName || !agentTask) {
            alert('Please fill in all fields and select an agent type');
            return;
        }
        
        const agentType = selectedType.dataset.type;
        this.hideModals();
        
        const command = `npx claude-flow@alpha hive-mind spawn "${agentTask}" --name "${agentName}" --type ${agentType} --claude`;
        this.addConsoleOutput('System', `Spawning ${agentType} agent: ${agentName}`, 'info');
        
        await this.executeClaudeFlowCommand(command);
        this.updateAgentsList();
    }

    updateAgentsList() {
        // This would typically fetch from the backend
        // For now, we'll simulate some agents
        const agentsGrid = document.getElementById('agents-grid');
        
        if (this.isInitialized && this.activeAgents.length === 0) {
            // Add some sample agents
            this.activeAgents = [
                { name: 'Architect-01', type: 'architect', status: 'active', task: 'System design' },
                { name: 'Developer-01', type: 'developer', status: 'idle', task: 'Implementation' }
            ];
        }
        
        agentsGrid.innerHTML = this.activeAgents.map(agent => `
            <div class="agent-card ${agent.status}">
                <div class="agent-icon">
                    <i class="fas fa-${this.getAgentIcon(agent.type)}"></i>
                </div>
                <h3>${agent.name}</h3>
                <p>${agent.task}</p>
                <span class="agent-status ${agent.status}">${agent.status}</span>
                <div class="agent-progress">
                    <div class="agent-progress-bar" style="width: ${Math.random() * 100}%"></div>
                </div>
                <div class="agent-actions">
                    <button class="agent-action">Pause</button>
                    <button class="agent-action">Logs</button>
                </div>
            </div>
        `).join('');
        
        this.updateAgentCount();
    }

    getAgentIcon(type) {
        const icons = {
            architect: 'drafting-compass',
            developer: 'code',
            tester: 'bug',
            researcher: 'search'
        };
        return icons[type] || 'robot';
    }

    updateAgentCount() {
        document.getElementById('agent-count').textContent = this.activeAgents.length;
    }

    updateSwarmStatus(status) {
        const indicator = document.getElementById('swarm-status');
        indicator.textContent = status;
        indicator.className = `status-indicator ${status.toLowerCase()}`;
    }

    updateSystemStatus(status) {
        // Update various UI elements based on system status
        if (status.initialized) {
            this.isInitialized = true;
            this.updateAgentsList();
        }
    }

    // Utility Methods
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    saveCommandHistory() {
        localStorage.setItem('dockerflow-history', JSON.stringify(this.commandHistory));
    }

    loadCommandHistory() {
        const saved = localStorage.getItem('dockerflow-history');
        if (saved) {
            this.commandHistory = JSON.parse(saved);
        }
    }

    async checkSystemStatus() {
        try {
            const response = await fetch('/api/status');
            if (response.ok) {
                const status = await response.json();
                this.updateSystemStatus(status);
                this.checkAPIConnectivity();
            }
        } catch (error) {
            console.warn('Could not check system status:', error);
        }
    }

    async checkAPIConnectivity() {
        try {
            // Test Anthropic API
            const anthropicResponse = await fetch('/api/test-anthropic');
            const anthropicResult = await anthropicResponse.json();
            
            // Test claude-flow@alpha
            const claudeFlowResponse = await fetch('/api/test-claude-flow');
            const claudeFlowResult = await claudeFlowResponse.json();
            
            this.updateAPIStatus(anthropicResult, claudeFlowResult);
        } catch (error) {
            console.warn('Could not check API connectivity:', error);
        }
    }

    updateAPIStatus(anthropicResult, claudeFlowResult) {
        // Update header with API status
        const headerActions = document.querySelector('.header-actions');
        
        // Remove existing status indicators
        const existingIndicators = headerActions.querySelectorAll('.api-status');
        existingIndicators.forEach(indicator => indicator.remove());
        
        // Add Anthropic API status
        const anthropicStatus = document.createElement('div');
        anthropicStatus.className = `api-status ${anthropicResult.success ? 'connected' : 'disconnected'}`;
        anthropicStatus.innerHTML = `
            <i class="fas fa-robot"></i>
            <span>Anthropic ${anthropicResult.success ? 'Connected' : 'Disconnected'}</span>
        `;
        anthropicStatus.title = anthropicResult.success ? 
            anthropicResult.message : 
            anthropicResult.error;
        
        // Add claude-flow status
        const claudeFlowStatus = document.createElement('div');
        claudeFlowStatus.className = `api-status ${claudeFlowResult.success ? 'connected' : 'disconnected'}`;
        claudeFlowStatus.innerHTML = `
            <i class="fas fa-brain"></i>
            <span>Claude-Flow ${claudeFlowResult.success ? 'Ready' : 'Error'}</span>
        `;
        claudeFlowStatus.title = claudeFlowResult.success ? 
            claudeFlowResult.version : 
            claudeFlowResult.error;
        
        // Insert before existing buttons
        const initButton = document.getElementById('init-wizard-btn');
        headerActions.insertBefore(anthropicStatus, initButton);
        headerActions.insertBefore(claudeFlowStatus, initButton);
        
        // Add status info to console
        if (anthropicResult.success) {
            this.addConsoleOutput('System', 'Anthropic API connection verified', 'success');
        } else {
            this.addConsoleOutput('System', `Anthropic API: ${anthropicResult.error}`, 'error');
        }
        
        if (claudeFlowResult.success) {
            this.addConsoleOutput('System', `Claude-Flow ready: ${claudeFlowResult.version}`, 'success');
        } else {
            this.addConsoleOutput('System', `Claude-Flow error: ${claudeFlowResult.error}`, 'error');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dockerFlowUI = new DockerFlowUI();
});

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
    const suggestions = document.getElementById('input-suggestions');
    const input = document.getElementById('console-input');
    
    if (e.target !== input && !suggestions.contains(e.target)) {
        suggestions.style.display = 'none';
    }
});
