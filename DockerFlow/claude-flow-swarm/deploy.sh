#!/bin/bash

echo "DockerFlow Swarm Deployment Script"
echo "=========================================="

# Check if running in swarm mode
if ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q "active"; then
    echo "❌ Docker is not in swarm mode"
    echo "To initialize swarm: docker swarm init"
    exit 1
fi

echo "✅ Docker swarm is active"

# Check if API key secret exists
if ! docker secret ls | grep -q "anthropic_api_key"; then
    echo "⚠️  anthropic_api_key secret not found"
    echo "Create it with: echo 'your_api_key' | docker secret create anthropic_api_key -"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ anthropic_api_key secret found"
fi

# Build the image if needed
if ! docker images | grep -q "dockerflow.*latest"; then
    echo "🔨 Building DockerFlow image..."
    docker build -t dockerflow:latest .
    if [ $? -ne 0 ]; then
        echo "❌ Failed to build image"
        exit 1
    fi
    echo "✅ Image built successfully"
else
    echo "✅ dockerflow:latest image found"
fi

# Deploy the stack
echo "🚀 Deploying DockerFlow stack..."
docker stack deploy -c docker-stack.yml dockerflow

if [ $? -eq 0 ]; then
    echo "✅ Stack deployed successfully!"
    echo ""
    echo "📊 Stack Status:"
    docker stack ps dockerflow
    echo ""
    echo "🌐 Service URLs:"
    echo "  - Main UI: http://localhost:4000"
    echo "  - Alt UI:  http://localhost:4001"
    echo "  - Admin:   http://localhost:4080"
    echo ""
    echo "📝 Useful commands:"
    echo "  docker stack ps dockerflow              # Check service status"
    echo "  docker service logs dockerflow_dockerflow-service  # View logs"
    echo "  docker exec -it \$(docker ps -q -f name=dockerflow_dockerflow-service) bash  # Connect to container"
    echo "  docker stack rm dockerflow              # Remove stack"
else
    echo "❌ Failed to deploy stack"
    exit 1
fi
