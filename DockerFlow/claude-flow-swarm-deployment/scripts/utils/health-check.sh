#!/bin/bash
# Health Check Script for Claude Flow v2 Docker Swarm Deployment
# Performs comprehensive health checks on all components

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${BASE_URL:-http://localhost:4000}"
API_URL="${API_URL:-http://localhost:4001}"
WEBSOCKET_URL="${WEBSOCKET_URL:-ws://localhost:4000/ws}"
TIMEOUT="${TIMEOUT:-10}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Health check functions
check_docker_swarm() {
    log_info "Checking Docker Swarm status..."
    
    if ! docker node ls >/dev/null 2>&1; then
        log_error "Docker Swarm is not initialized or not accessible"
        return 1
    fi
    
    local manager_count
    manager_count=$(docker node ls --filter role=manager --format "{{.ID}}" | wc -l)
    
    if [ "$manager_count" -lt 1 ]; then
        log_error "No manager nodes found in swarm"
        return 1
    fi
    
    log_success "Docker Swarm is healthy ($manager_count manager(s))"
    return 0
}

check_services() {
    log_info "Checking Docker services..."
    
    local service_count
    service_count=$(docker service ls --filter name=claude-flow --format "{{.Name}}" | wc -l)
    
    if [ "$service_count" -eq 0 ]; then
        log_error "No Claude Flow services found"
        return 1
    fi
    
    local running_services
    running_services=$(docker service ls --filter name=claude-flow --format "{{.Name}} {{.Replicas}}" | grep -v "0/")
    
    if [ -z "$running_services" ]; then
        log_error "Claude Flow services are not running"
        return 1
    fi
    
    log_success "Claude Flow services are running:"
    echo "$running_services" | while read -r line; do
        echo "  - $line"
    done
    
    return 0
}

check_api_endpoint() {
    log_info "Checking API endpoint..."
    
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "${BASE_URL}/api/status" || echo "000")
    
    if [ "$status_code" != "200" ]; then
        log_error "API endpoint health check failed (HTTP $status_code)"
        return 1
    fi
    
    log_success "API endpoint is healthy"
    return 0
}

check_websocket() {
    log_info "Checking WebSocket endpoint..."
    
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
        -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Key: $(echo -n "test" | base64)" \
        -H "Sec-WebSocket-Version: 13" \
        "${BASE_URL}/ws" || echo "000")
    
    if [ "$status_code" != "101" ]; then
        log_error "WebSocket endpoint check failed (HTTP $status_code)"
        return 1
    fi
    
    log_success "WebSocket endpoint is healthy"
    return 0
}

check_web_ui() {
    log_info "Checking Web UI..."
    
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "${BASE_URL}/console/" || echo "000")
    
    if [ "$status_code" != "200" ]; then
        log_error "Web UI check failed (HTTP $status_code)"
        return 1
    fi
    
    log_success "Web UI is accessible"
    return 0
}

check_secrets() {
    log_info "Checking Docker secrets..."
    
    if ! docker secret ls --filter name=anthropic_api_key --format "{{.Name}}" | grep -q anthropic_api_key; then
        log_error "Anthropic API key secret not found"
        return 1
    fi
    
    log_success "Required secrets are present"
    return 0
}

check_volumes() {
    log_info "Checking Docker volumes..."
    
    local required_volumes=("claude_flow_data" "claude_flow_config" "claude_projects")
    local missing_volumes=()
    
    for volume in "${required_volumes[@]}"; do
        if ! docker volume ls --filter name="$volume" --format "{{.Name}}" | grep -q "$volume"; then
            missing_volumes+=("$volume")
        fi
    done
    
    if [ ${#missing_volumes[@]} -gt 0 ]; then
        log_warning "Some volumes are missing: ${missing_volumes[*]}"
        log_warning "This may be normal for fresh installations"
    else
        log_success "All required volumes exist"
    fi
    
    return 0
}

check_network() {
    log_info "Checking Docker networks..."
    
    if ! docker network ls --filter name=claude-flow-network --format "{{.Name}}" | grep -q claude-flow-network; then
        log_error "Claude Flow network not found"
        return 1
    fi
    
    log_success "Docker network is configured correctly"
    return 0
}

check_resource_usage() {
    log_info "Checking resource usage..."
    
    # Get container stats
    local container_stats
    container_stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep claude-flow || true)
    
    if [ -z "$container_stats" ]; then
        log_warning "No Claude Flow containers found for resource check"
        return 0
    fi
    
    log_success "Resource usage:"
    echo "$container_stats"
    
    return 0
}

check_logs_for_errors() {
    log_info "Checking recent logs for errors..."
    
    local error_count
    error_count=$(docker service logs claude-flow_claude-flow-alpha --since 5m 2>/dev/null | grep -i error | wc -l || echo "0")
    
    if [ "$error_count" -gt 0 ]; then
        log_warning "Found $error_count error(s) in recent logs"
        log_info "Recent errors:"
        docker service logs claude-flow_claude-flow-alpha --since 5m 2>/dev/null | grep -i error | tail -5
    else
        log_success "No recent errors found in logs"
    fi
    
    return 0
}

# Performance checks
check_response_time() {
    log_info "Checking API response time..."
    
    local response_time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time "$TIMEOUT" "${BASE_URL}/api/status" || echo "999")
    
    if [ "$(echo "$response_time > 5.0" | bc -l 2>/dev/null || echo 1)" -eq 1 ]; then
        log_warning "API response time is slow: ${response_time}s"
    else
        log_success "API response time is good: ${response_time}s"
    fi
    
    return 0
}

# Main health check function
run_health_checks() {
    local failed_checks=0
    local total_checks=0
    
    echo "========================================"
    echo "Claude Flow v2 Health Check Report"
    echo "Timestamp: $(date)"
    echo "========================================"
    echo
    
    # Array of check functions
    local checks=(
        "check_docker_swarm"
        "check_services"
        "check_secrets"
        "check_network"
        "check_volumes"
        "check_api_endpoint"
        "check_websocket"
        "check_web_ui"
        "check_resource_usage"
        "check_logs_for_errors"
        "check_response_time"
    )
    
    # Run all checks
    for check in "${checks[@]}"; do
        ((total_checks++))
        echo
        if ! $check; then
            ((failed_checks++))
        fi
    done
    
    echo
    echo "========================================"
    echo "Health Check Summary"
    echo "========================================"
    echo "Total checks: $total_checks"
    echo "Passed: $((total_checks - failed_checks))"
    echo "Failed: $failed_checks"
    
    if [ $failed_checks -eq 0 ]; then
        log_success "All health checks passed! 🎉"
        echo
        echo "Your Claude Flow deployment is healthy and ready to use."
        echo "Access the Web UI at: $BASE_URL/console/"
        return 0
    else
        log_error "$failed_checks health check(s) failed"
        echo
        echo "Please check the failed components and review the troubleshooting guide:"
        echo "https://github.com/yourusername/claude-flow-swarm-deployment/blob/main/docs/troubleshooting/README.md"
        return 1
    fi
}

# Script options
show_help() {
    cat << EOF
Claude Flow v2 Health Check Script

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message
    -q, --quiet         Quiet mode (minimal output)
    -v, --verbose       Verbose mode (detailed output)
    --base-url URL      Base URL for health checks (default: http://localhost:4000)
    --api-url URL       API URL for health checks (default: http://localhost:4001)
    --timeout SECONDS   Timeout for HTTP requests (default: 10)
    --json              Output results in JSON format

EXAMPLES:
    $0                                          # Run all health checks
    $0 --base-url http://192.168.1.100:4000   # Check remote instance
    $0 --quiet                                 # Minimal output
    $0 --json                                  # JSON output for automation

EOF
}

# Parse command line arguments
QUIET=false
VERBOSE=false
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --base-url)
            BASE_URL="$2"
            shift 2
            ;;
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Quiet mode adjustments
if [ "$QUIET" = true ]; then
    log_info() { :; }
    log_warning() { :; }
fi

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

# Main execution
main() {
    check_dependencies
    
    if [ "$JSON_OUTPUT" = true ]; then
        # TODO: Implement JSON output format
        log_error "JSON output not yet implemented"
        exit 1
    fi
    
    run_health_checks
}

# Run the main function
main "$@"
