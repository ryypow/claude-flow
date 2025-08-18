#!/bin/bash

STACK_NAME="dockerflow"
STACK_FILE="docker-stack.yml"

case "$1" in
    "build")
        echo "🔨 Building DockerFlow swarm image..."
        echo "This will take 15-20 minutes for comprehensive dependencies"
        docker build -t dockerflow:latest .
        ;;
        
    "deploy")
        echo "🚀 Deploying DockerFlow stack to swarm..."
        
        # Check swarm status
        if ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q active; then
            echo "❌ Docker swarm not active"
            exit 1
        fi
        
        # Check secret exists
        if ! docker secret ls --format '{{.Name}}' | grep -q "^anthropic_api_key$"; then
            echo "❌ Secret 'anthropic_api_key' not found"
            exit 1
        fi
        
        # Deploy stack
        docker stack deploy -c $STACK_FILE $STACK_NAME
        echo "✅ Stack deployed successfully"
        
        echo ""
        echo "🔍 Service status:"
        docker service ls --filter name=$STACK_NAME
        
        echo ""
        echo "📋 Next steps:"
        echo "1. $0 status        # Check deployment status"
        echo "2. $0 logs          # Monitor logs"
        echo "3. $0 shell         # Access container"
        echo "4. $0 access       # Access DockerFlow"
        ;;
        
    "status")
        echo "📊 DockerFlow swarm status:"
        echo ""
        echo "Services:"
        docker service ls --filter name=$STACK_NAME
        echo ""
        echo "Tasks:"
        docker service ps ${STACK_NAME}_dockerflow-service
        echo ""
        echo "Service details:"
        docker service inspect ${STACK_NAME}_dockerflow-service --pretty
        ;;
        
    "logs")
        echo "📋 DockerFlow service logs:"
        docker service logs -f ${STACK_NAME}_dockerflow-service
        ;;
        
    "shell")
        echo "🐚 Accessing DockerFlow container shell..."
        
        # Get the container ID from the service
        TASK_ID=$(docker service ps ${STACK_NAME}_dockerflow-service --format "{{.ID}}" --filter "desired-state=running" | head -1)
        if [ -z "$TASK_ID" ]; then
            echo "❌ No running tasks found"
            exit 1
        fi
        
        # Get the actual container ID
        CONTAINER_ID=$(docker inspect $TASK_ID --format "{{.Status.ContainerStatus.ContainerID}}")
        if [ -z "$CONTAINER_ID" ]; then
            echo "❌ Could not find container"
            exit 1
        fi
        
        echo "Connecting to container: $CONTAINER_ID"
        docker exec -it $CONTAINER_ID bash
        ;;
        
    "access")
        echo "🔄 Accessing DockerFlow service..."
        
        TASK_ID=$(docker service ps ${STACK_NAME}_dockerflow-service --format "{{.ID}}" --filter "desired-state=running" | head -1)
        CONTAINER_ID=$(docker inspect $TASK_ID --format "{{.Status.ContainerStatus.ContainerID}}")
        
        if [ -n "$CONTAINER_ID" ]; then
            echo "Welcome to DockerFlow v1.0.0 - AI Development, Containerized"
        else
            echo "❌ Could not find running container"
        fi
        ;;
        
    "scale")
        replicas=${2:-1}
        echo "⚖️ Scaling DockerFlow service to $replicas replicas..."
        docker service scale ${STACK_NAME}_dockerflow-service=$replicas
        ;;
        
    "update")
        echo "🔄 Updating DockerFlow service..."
        docker service update --force ${STACK_NAME}_dockerflow-service
        ;;
        
    "remove")
        echo "🗑️ Removing DockerFlow stack..."
        read -p "Are you sure? This will remove all services and data. (y/N): " confirm
        if [[ $confirm == [yY] ]]; then
            docker stack rm $STACK_NAME
            echo "✅ Stack removed"
        fi
        ;;
        
    "network")
        echo "🌐 DockerFlow network information:"
        docker network ls --filter name=dockerflow
        echo ""
        docker network inspect dockerflow_dockerflow-network 2>/dev/null || echo "Network not yet created"
        ;;
        
    "volumes")
        echo "💾 DockerFlow volumes:"
        docker volume ls --filter name=dockerflow
        ;;
        
    "nodes")
        echo "🖥️ Swarm nodes:"
        docker node ls
        ;;
        
    *)
        echo "DockerFlow - AI Development, Containerized"
        echo "Usage: $0 {build|deploy|status|logs|shell|access|scale|update|remove|network|volumes|nodes}"
        echo ""
        echo "🚀 Deployment Commands:"
        echo "  build       - Build the swarm-optimized image (15-20 min)"
        echo "  deploy      - Deploy DockerFlow stack to swarm"
        echo "  access      - Access DockerFlow service container"
        echo ""
        echo "📊 Management Commands:"
        echo "  status      - Show service status and tasks"
        echo "  logs        - Follow service logs"
        echo "  shell       - Access container shell"
        echo "  scale       - Scale service: $0 scale <replicas>"
        echo "  update      - Force service update/restart"
        echo ""
        echo "🔧 Utility Commands:"
        echo "  network     - Show network information"
        echo "  volumes     - List persistent volumes"
        echo "  nodes       - Show swarm nodes"
        echo "  remove      - Remove entire stack (destructive)"
        echo ""
        echo "📋 Prerequisites:"
        echo "  - Docker swarm initialized: docker swarm init"
        echo "  - API key secret: echo 'key' | docker secret create anthropic_api_key -"
        ;;
esac
