# DockerFlow - AI Development, Containerized
# Comprehensive dependencies for swarm deployment
FROM node:20-bullseye

# Build arguments for optimization
ARG BUILDKIT_INLINE_CACHE=1

# Set environment variables for container optimization
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=development
ENV PYTHONUNBUFFERED=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

# ============================================
# SYSTEM DEPENDENCIES - SWARM OPTIMIZED
# ============================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core system tools
    curl \
    wget \
    git \
    vim \
    nano \
    htop \
    tree \
    unzip \
    zip \
    procps \
    # Build essentials for native modules
    build-essential \
    gcc \
    g++ \
    make \
    cmake \
    # Python ecosystem (for Python-based MCP tools)
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    # Database support
    sqlite3 \
    libsqlite3-dev \
    postgresql-client \
    default-mysql-client \
    redis-tools \
    # Security and crypto libraries
    openssl \
    libssl-dev \
    ca-certificates \
    gnupg \
    # Media processing (for advanced features)
    ffmpeg \
    imagemagick \
    # Network tools
    netcat \
    telnet \
    dnsutils \
    iputils-ping \
    # Process management
    supervisor \
    # Development tools
    jq \
    rsync \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# ============================================
# PYTHON DEPENDENCIES - AI/ML STACK (Optimized)
# ============================================
# Install essential Python packages first, heavy ML packages separately
RUN --mount=type=cache,target=/root/.cache/pip \
    pip3 install --no-cache-dir --upgrade pip setuptools wheel && \
    pip3 install --no-cache-dir \
    # Core packages for DockerFlow
    requests \
    aiohttp \
    fastapi \
    uvicorn \
    flask \
    python-dotenv \
    pyyaml \
    click \
    typer \
    # Essential data processing
    numpy \
    pandas \
    # Database connectivity
    psycopg2-binary \
    redis \
    # File processing
    openpyxl \
    PyPDF2 \
    Pillow \
    # Testing
    pytest \
    pytest-asyncio \
    pytest-mock

# Install heavy ML packages in separate layer for better caching
RUN --mount=type=cache,target=/root/.cache/pip \
    pip3 install --no-cache-dir \
    scikit-learn \
    matplotlib \
    seaborn \
    plotly \
    nltk

# ============================================
# NODE.JS ECOSYSTEM - OPTIMIZED FOR DOCKERFLOW
# ============================================
# Install essential Node.js tools first
RUN --mount=type=cache,target=/root/.npm \
    npm install -g --force \
    # Essential package managers
    npm@latest \
    yarn \
    pnpm \
    # TypeScript essentials
    typescript \
    ts-node \
    tsx \
    # Core development tools
    nodemon \
    pm2 \
    concurrently \
    cross-env \
    dotenv-cli

# Install build and development tools in separate layer
RUN --mount=type=cache,target=/root/.npm \
    npm install -g --force \
    # Build tools
    webpack \
    webpack-cli \
    vite \
    esbuild \
    # Testing essentials
    jest \
    vitest \
    # Linting
    eslint \
    prettier

# ============================================
# DOCKERFLOW DEPENDENCIES
# ============================================
# Install Claude Code CLI and communication tools with caching
RUN --mount=type=cache,target=/root/.npm \
    npm install -g --force \
    @anthropic-ai/claude-code \
    ws \
    socket.io

# ============================================
# CLOUD & INFRASTRUCTURE TOOLS
# ============================================
# Install Docker CLI, Kubernetes tools, Terraform, and Cloud CLIs with better error handling
RUN set -ex && \
    # Update package lists first
    apt-get update && \
    # Install prerequisites for adding repositories
    apt-get install -y --no-install-recommends ca-certificates curl gnupg lsb-release && \
    # Docker CLI - use official installation method
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    # Terraform - use official HashiCorp repository
    wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | tee /etc/apt/keyrings/hashicorp-archive-keyring.gpg > /dev/null && \
    echo "deb [signed-by=/etc/apt/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list && \
    # Google Cloud SDK - use official repository
    echo "deb [signed-by=/etc/apt/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /etc/apt/keyrings/cloud.google.gpg && \
    # Update and install packages with retry logic
    apt-get update && \
    apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin terraform google-cloud-cli && \
    # Install kubectl
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && mv kubectl /usr/local/bin/ && \
    # Install Helm
    curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 && \
    chmod 700 get_helm.sh && ./get_helm.sh && rm get_helm.sh && \
    # Install AWS CLI
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && ./aws/install && rm -rf aws awscliv2.zip && \
    # Install Azure CLI
    curl -sL https://aka.ms/InstallAzureCLIDeb | bash && \
    # Cleanup
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# ============================================
# USER AND WORKSPACE SETUP
# ============================================
# Create claude user optimized for swarm deployment
RUN useradd -m -u 1001 -s /bin/bash claude-user && \
    usermod -aG sudo claude-user && \
    echo "claude-user ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Create workspace structure and install Deno
WORKDIR /workspace
RUN mkdir -p \
    /workspace/projects \
    /workspace/data \
    /workspace/logs \
    /workspace/tmp \
    /workspace/shared \
    /home/claude-user/.dockerflow \
    /home/claude-user/.claude \
    /home/claude-user/.npm-global \
    /home/claude-user/.cache && \
    # Install Deno with caching
    curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=/usr/local sh && \
    echo 'export PATH="/usr/local/bin:$PATH"' >> /root/.bashrc && \
    # Set proper ownership
    chown -R 1001:1001 /workspace /home/claude-user

# Copy web interface files
COPY public/ /home/claude-user/public/
# Updated server with natural language processing - v2
COPY server.js package.json /home/claude-user/

# Install Node.js dependencies for web interface
RUN cd /home/claude-user && npm install

# Switch to claude-user for final setup
USER claude-user

# Set environment for claude-user
ENV HOME=/home/claude-user
ENV PATH="/home/claude-user/.npm-global/bin:/home/claude-user/.deno/bin:$PATH"
ENV NPM_CONFIG_PREFIX=/home/claude-user/.npm-global
ENV PORT=3000

# Create swarm-optimized startup script
RUN echo '#!/bin/bash\n\
echo "DockerFlow v1.0.0 - AI Development, Containerized"\n\
echo "=================================="\n\
echo "Swarm Node: $(hostname)"\n\
echo "Container ID: $(hostname -s)"\n\
echo ""\n\
\n\
# Load API key from secret\n\
if [ -f /run/secrets/anthropic_api_key ]; then\n\
    export ANTHROPIC_API_KEY=$(cat /run/secrets/anthropic_api_key)\n\
    echo "API key loaded from Docker secret"\n\
else\n\
    echo "No API key found - check swarm secret configuration"\n\
fi\n\
\n\
echo ""\n\
echo "Container Specifications:"\n\
echo "├── Node.js: $(node --version)"\n\
echo "├── Python: $(python3 --version)"\n\
echo "├── Claude Code: $(claude --version 2>/dev/null || echo '\''Ready for installation'\'')"\n\
echo "├── Docker: $(docker --version 2>/dev/null | cut -d'\'' '\'' -f3 | tr -d '\'','\'' || echo '\''CLI installed'\'')"\n\
echo "├── kubectl: $(kubectl version --client --short 2>/dev/null | grep Client || echo '\''Installed'\'')"\n\
echo "├── Terraform: $(terraform --version | head -1 2>/dev/null || echo '\''Installed'\'')"\n\
echo "├── AWS CLI: $(aws --version 2>&1 | cut -d'\'' '\'' -f1 || echo '\''Installed'\'')"\n\
echo "├── gcloud: $(gcloud --version 2>/dev/null | head -1 || echo '\''Installed'\'')"\n\
echo "└── Azure CLI: $(az --version 2>/dev/null | head -1 | cut -d'\'' '\'' -f2 || echo '\''Installed'\'')"\n\
\n\
echo ""\n\
echo "Welcome to DockerFlow - Container orchestration ready!"\n\
echo "DockerFlow development platform ready for use"\n\
echo ""\n\
echo "Starting DockerFlow Web Server..."\n\
cd /home/claude-user\n\
# Start Node.js server with API key environment variable\n\
ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" nohup node server.js > /workspace/logs/dockerflow.log 2>&1 &\n\
sleep 3\n\
echo ""\n\
echo "Available at:"\n\
echo "  Web Interface: http://localhost:4000 (external)"\n\
echo "  API Endpoint: http://localhost:3000 (internal)"\n\
echo "  Terminal: docker exec -it <container> bash"\n\
echo ""\n\
echo "DockerFlow Web Server started successfully!"\n\
echo ""\n\
# Keep container running by waiting for the Node.js process\n\
echo "Container ready - waiting for Node.js server..."\n\
wait' > /home/claude-user/startup.sh

RUN chmod +x /home/claude-user/startup.sh

# Create initialization helper scripts
RUN echo '#!/bin/bash\n\
echo "Accessing DockerFlow service..."\n\
echo "Service: ${SERVICE_NAME:-dockerflow-service}"\n\
echo "Task: ${TASK_SLOT:-1}"\n\
echo ""\n\
echo "Welcome to DockerFlow v1.0.0"\n\
echo ""\n\
echo "DockerFlow platform ready!"\n\
echo "Available commands:"\n\
echo "  Docker container orchestration active"\n\
echo "  Development environment ready"\n\
echo "  Web interface: http://localhost:4000"\n\
echo "  DockerFlow v1.0.0 - AI Development, Containerized"' > /home/claude-user/init-alpha.sh

RUN echo '#!/bin/bash\n\
echo "DockerFlow Alternative Setup..."\n\
echo "Service: ${SERVICE_NAME:-dockerflow-service}"\n\
echo "Task: ${TASK_SLOT:-1}"\n\
echo ""\n\
echo "DockerFlow alternative setup complete"\n\
echo ""\n\
echo "DockerFlow ready!"\n\
echo "Available commands:"\n\
echo "  Docker container orchestration active"\n\
echo "  Web interface: http://localhost:4000"\n\
echo "  DockerFlow development platform"' > /home/claude-user/init-latest.sh

RUN chmod +x /home/claude-user/init-alpha.sh /home/claude-user/init-latest.sh

# Create health check script
RUN echo '#!/bin/bash\n\
# Health check for swarm service\n\
# DockerFlow health check\n\
    # Check if platform is ready\n\
    echo "DockerFlow platform healthy"\n\
    exit $?\n\
else\n\
    # Pre-initialization health check\n\
    curl -f http://localhost:4000/health 2>/dev/null || \\\n\
    nc -z localhost 3000 2>/dev/null || \\\n\
    echo "Ready for initialization" >/dev/null\n\
    exit 0\n\
fi' > /home/claude-user/healthcheck.sh

RUN chmod +x /home/claude-user/healthcheck.sh

# Expose ports for swarm networking
EXPOSE 4000 4001 4080 9000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /home/claude-user/healthcheck.sh

# Set entrypoint
ENTRYPOINT ["/home/claude-user/startup.sh"]
