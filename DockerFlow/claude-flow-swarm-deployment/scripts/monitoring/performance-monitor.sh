#!/bin/bash
# Performance Monitoring Script for Claude Flow v2
# Monitors system resources, API performance, and generates reports

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${LOG_DIR:-${SCRIPT_DIR}/../../logs}"
REPORT_DIR="${REPORT_DIR:-${SCRIPT_DIR}/../../reports}"
BASE_URL="${BASE_URL:-http://localhost:4000}"
MONITOR_DURATION="${MONITOR_DURATION:-3600}"  # 1 hour default
SAMPLE_INTERVAL="${SAMPLE_INTERVAL:-30}"      # 30 seconds default

# Create directories
mkdir -p "$LOG_DIR" "$REPORT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_DIR/monitor.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_DIR/monitor.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_DIR/monitor.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_DIR/monitor.log"
}

# Performance monitoring functions
collect_system_metrics() {
    local timestamp="$1"
    local metrics_file="$2"
    
    # CPU usage
    local cpu_usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    
    # Memory usage
    local mem_info
    mem_info=$(free -m | grep "Mem:")
    local mem_total=$(echo "$mem_info" | awk '{print $2}')
    local mem_used=$(echo "$mem_info" | awk '{print $3}')
    local mem_percent=$(echo "scale=2; $mem_used * 100 / $mem_total" | bc -l)
    
    # Disk usage
    local disk_usage
    disk_usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    # Load average
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | sed 's/^[ \t]*//')
    
    # Network statistics
    local network_stats
    network_stats=$(cat /proc/net/dev | grep -E "(eth0|ens|enp)" | head -1 | awk '{print $2,$10}')
    local rx_bytes=$(echo "$network_stats" | awk '{print $1}')
    local tx_bytes=$(echo "$network_stats" | awk '{print $2}')
    
    # Write to metrics file
    echo "$timestamp,$cpu_usage,$mem_percent,$disk_usage,$load_avg,$rx_bytes,$tx_bytes" >> "$metrics_file"
}

collect_docker_metrics() {
    local timestamp="$1"
    local docker_file="$2"
    
    # Docker container stats
    local container_stats
    container_stats=$(docker stats --no-stream --format "{{.Container}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}" | grep claude-flow || echo "")
    
    if [ -n "$container_stats" ]; then
        echo "$timestamp,$container_stats" >> "$docker_file"
    fi
    
    # Docker service info
    local service_info
    service_info=$(docker service ps claude-flow_claude-flow-alpha --format "{{.CurrentState}}" 2>/dev/null | head -1 || echo "unknown")
    
    # Count running replicas
    local replica_count
    replica_count=$(docker service ls --filter name=claude-flow --format "{{.Replicas}}" | head -1 || echo "0/0")
    
    echo "$timestamp,service_state,$service_info,replicas,$replica_count" >> "$docker_file"
}

collect_api_metrics() {
    local timestamp="$1"
    local api_file="$2"
    
    # API response time
    local response_time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "${BASE_URL}/api/status" 2>/dev/null || echo "timeout")
    
    # API status code
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/api/status" 2>/dev/null || echo "000")
    
    # WebSocket connectivity
    local ws_status
    ws_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
        -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Key: $(echo -n "test" | base64)" \
        -H "Sec-WebSocket-Version: 13" \
        "${BASE_URL}/ws" 2>/dev/null || echo "000")
    
    # Try to get system info from API
    local api_data
    api_data=$(curl -s --max-time 5 "${BASE_URL}/api/status" 2>/dev/null || echo "{}")
    
    # Parse API response for metrics (if available)
    local active_agents="unknown"
    local queued_tasks="unknown"
    
    if command -v jq >/dev/null 2>&1 && [ "$api_data" != "{}" ]; then
        active_agents=$(echo "$api_data" | jq -r '.metrics.active_agents // "unknown"' 2>/dev/null || echo "unknown")
        queued_tasks=$(echo "$api_data" | jq -r '.metrics.queued_tasks // "unknown"' 2>/dev/null || echo "unknown")
    fi
    
    echo "$timestamp,$response_time,$status_code,$ws_status,$active_agents,$queued_tasks" >> "$api_file"
}

monitor_performance() {
    local duration="$1"
    local interval="$2"
    local start_time
    start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    # Create metric files with headers
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local system_metrics="$LOG_DIR/system_metrics_$timestamp.csv"
    local docker_metrics="$LOG_DIR/docker_metrics_$timestamp.csv"
    local api_metrics="$LOG_DIR/api_metrics_$timestamp.csv"
    
    # Write CSV headers
    echo "timestamp,cpu_percent,memory_percent,disk_percent,load_avg,rx_bytes,tx_bytes" > "$system_metrics"
    echo "timestamp,container,cpu_percent,memory_usage,memory_percent,network_io,block_io" > "$docker_metrics"
    echo "timestamp,response_time,status_code,websocket_status,active_agents,queued_tasks" > "$api_metrics"
    
    log_info "Starting performance monitoring for $duration seconds..."
    log_info "Sample interval: $interval seconds"
    log_info "Metrics will be saved to: $LOG_DIR/"
    
    local sample_count=0
    
    while [ $(date +%s) -lt $end_time ]; do
        local current_time
        current_time=$(date '+%Y-%m-%d %H:%M:%S')
        
        # Collect all metrics
        collect_system_metrics "$current_time" "$system_metrics" &
        collect_docker_metrics "$current_time" "$docker_metrics" &
        collect_api_metrics "$current_time" "$api_metrics" &
        
        # Wait for background jobs
        wait
        
        ((sample_count++))
        local progress=$((sample_count * interval * 100 / duration))
        echo -ne "\rProgress: $progress% ($sample_count samples collected)"
        
        sleep "$interval"
    done
    
    echo  # New line after progress
    log_success "Performance monitoring completed. $sample_count samples collected."
    
    # Generate report
    generate_report "$timestamp" "$system_metrics" "$docker_metrics" "$api_metrics"
}

generate_report() {
    local timestamp="$1"
    local system_file="$2"
    local docker_file="$3"
    local api_file="$4"
    
    local report_file="$REPORT_DIR/performance_report_$timestamp.md"
    
    log_info "Generating performance report: $report_file"
    
    cat > "$report_file" << EOF
# Claude Flow v2 Performance Report

**Generated:** $(date)  
**Duration:** $MONITOR_DURATION seconds  
**Sample Interval:** $SAMPLE_INTERVAL seconds  

## Summary

EOF
    
    # System metrics summary
    if [ -f "$system_file" ] && [ $(wc -l < "$system_file") -gt 1 ]; then
        echo "### System Metrics" >> "$report_file"
        echo "" >> "$report_file"
        
        # Calculate averages and peaks
        local avg_cpu
        avg_cpu=$(tail -n +2 "$system_file" | awk -F',' '{sum+=$2; count++} END {if(count>0) print sum/count; else print 0}')
        local max_cpu
        max_cpu=$(tail -n +2 "$system_file" | awk -F',' '{if($2>max) max=$2} END {print max+0}')
        
        local avg_mem
        avg_mem=$(tail -n +2 "$system_file" | awk -F',' '{sum+=$3; count++} END {if(count>0) print sum/count; else print 0}')
        local max_mem
        max_mem=$(tail -n +2 "$system_file" | awk -F',' '{if($3>max) max=$3} END {print max+0}')
        
        cat >> "$report_file" << EOF
- **CPU Usage:** Average: ${avg_cpu}%, Peak: ${max_cpu}%
- **Memory Usage:** Average: ${avg_mem}%, Peak: ${max_mem}%
- **Disk Usage:** $(tail -1 "$system_file" | cut -d',' -f4)%

EOF
    fi
    
    # API metrics summary
    if [ -f "$api_file" ] && [ $(wc -l < "$api_file") -gt 1 ]; then
        echo "### API Performance" >> "$report_file"
        echo "" >> "$report_file"
        
        local avg_response_time
        avg_response_time=$(tail -n +2 "$api_file" | awk -F',' '$2 != "timeout" {sum+=$2; count++} END {if(count>0) printf "%.3f", sum/count; else print "N/A"}')
        
        local error_count
        error_count=$(tail -n +2 "$api_file" | awk -F',' '$3 != "200" {count++} END {print count+0}')
        
        local total_requests
        total_requests=$(tail -n +2 "$api_file" | wc -l)
        
        local success_rate
        success_rate=$(echo "scale=2; ($total_requests - $error_count) * 100 / $total_requests" | bc -l 2>/dev/null || echo "N/A")
        
        cat >> "$report_file" << EOF
- **Average Response Time:** ${avg_response_time}s
- **Total Requests:** $total_requests
- **Failed Requests:** $error_count
- **Success Rate:** ${success_rate}%

EOF
    fi
    
    # Docker metrics summary
    if [ -f "$docker_file" ] && [ $(wc -l < "$docker_file") -gt 1 ]; then
        echo "### Docker Container Performance" >> "$report_file"
        echo "" >> "$report_file"
        
        local container_lines
        container_lines=$(grep -v "service_state" "$docker_file" | tail -n +2 | wc -l)
        
        if [ "$container_lines" -gt 0 ]; then
            local avg_container_cpu
            avg_container_cpu=$(grep -v "service_state" "$docker_file" | tail -n +2 | awk -F',' '{gsub(/%/, "", $3); sum+=$3; count++} END {if(count>0) printf "%.2f", sum/count; else print "N/A"}')
            
            echo "- **Average Container CPU:** ${avg_container_cpu}%" >> "$report_file"
        fi
        
        echo "" >> "$report_file"
    fi
    
    # Add file paths
    cat >> "$report_file" << EOF
## Raw Data Files

- **System Metrics:** \`$system_file\`
- **Docker Metrics:** \`$docker_file\`
- **API Metrics:** \`$api_file\`

## Charts and Graphs

To generate charts from this data, you can use the following commands:

\`\`\`bash
# Install required tools
pip install matplotlib pandas

# Generate charts
python scripts/monitoring/generate_charts.py \\
    --system "$system_file" \\
    --docker "$docker_file" \\
    --api "$api_file" \\
    --output "$REPORT_DIR/charts_$timestamp/"
\`\`\`

## Recommendations

EOF
    
    # Add performance recommendations based on metrics
    if [ -f "$system_file" ] && [ $(wc -l < "$system_file") -gt 1 ]; then
        local high_cpu_count
        high_cpu_count=$(tail -n +2 "$system_file" | awk -F',' '$2 > 80 {count++} END {print count+0}')
        
        local high_mem_count
        high_mem_count=$(tail -n +2 "$system_file" | awk -F',' '$3 > 80 {count++} END {print count+0}')
        
        if [ "$high_cpu_count" -gt 0 ]; then
            echo "- ⚠️ **High CPU Usage Detected:** CPU usage exceeded 80% in $high_cpu_count samples. Consider scaling up or optimizing workload." >> "$report_file"
        fi
        
        if [ "$high_mem_count" -gt 0 ]; then
            echo "- ⚠️ **High Memory Usage Detected:** Memory usage exceeded 80% in $high_mem_count samples. Consider increasing memory limits or scaling." >> "$report_file"
        fi
        
        if [ "$high_cpu_count" -eq 0 ] && [ "$high_mem_count" -eq 0 ]; then
            echo "- ✅ **System Performance:** No critical resource usage detected during monitoring period." >> "$report_file"
        fi
    fi
    
    if [ -f "$api_file" ] && [ $(wc -l < "$api_file") -gt 1 ]; then
        local slow_requests
        slow_requests=$(tail -n +2 "$api_file" | awk -F',' '$2 > 2.0 && $2 != "timeout" {count++} END {print count+0}')
        
        if [ "$slow_requests" -gt 0 ]; then
            echo "- ⚠️ **Slow API Responses:** $slow_requests requests took longer than 2 seconds. Consider performance optimization." >> "$report_file"
        else
            echo "- ✅ **API Performance:** All API responses were within acceptable limits." >> "$report_file"
        fi
    fi
    
    echo "" >> "$report_file"
    echo "---" >> "$report_file"
    echo "*Report generated by Claude Flow v2 Performance Monitor*" >> "$report_file"
    
    log_success "Performance report generated: $report_file"
}

# Real-time monitoring
real_time_monitor() {
    log_info "Starting real-time monitoring (Ctrl+C to stop)..."
    
    while true; do
        clear
        echo "========================================"
        echo "Claude Flow v2 Real-time Monitor"
        echo "Updated: $(date)"
        echo "========================================"
        echo
        
        # System info
        echo "SYSTEM RESOURCES:"
        echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')%"
        echo "Memory: $(free -h | grep "Mem:" | awk '{printf "%.1f/%.1fGB (%.1f%%)", $3/1024, $2/1024, $3*100/$2}')"
        echo "Load Average: $(uptime | awk -F'load average:' '{print $2}' | sed 's/^[ \t]*//')"
        echo
        
        # Docker info
        echo "DOCKER SERVICES:"
        docker service ls --filter name=claude-flow --format "table {{.Name}}\t{{.Mode}}\t{{.Replicas}}" 2>/dev/null || echo "No services found"
        echo
        
        # Container stats
        echo "CONTAINER RESOURCES:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep claude-flow || echo "No containers found"
        echo
        
        # API status
        echo "API STATUS:"
        local api_status
        api_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE_URL}/api/status" 2>/dev/null || echo "ERROR")
        local response_time
        response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 5 "${BASE_URL}/api/status" 2>/dev/null || echo "ERROR")
        
        if [ "$api_status" = "200" ]; then
            echo "API Health: ✅ Healthy (${response_time}s)"
        else
            echo "API Health: ❌ Unhealthy (HTTP $api_status)"
        fi
        
        # WebSocket status
        local ws_status
        ws_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 \
            -H "Connection: Upgrade" \
            -H "Upgrade: websocket" \
            -H "Sec-WebSocket-Key: test" \
            "${BASE_URL}/ws" 2>/dev/null || echo "ERROR")
        
        if [ "$ws_status" = "101" ]; then
            echo "WebSocket: ✅ Connected"
        else
            echo "WebSocket: ❌ Disconnected (HTTP $ws_status)"
        fi
        
        echo
        echo "Press Ctrl+C to stop monitoring..."
        
        sleep 5
    done
}

# Main function
show_help() {
    cat << EOF
Claude Flow v2 Performance Monitor

Usage: $0 [COMMAND] [OPTIONS]

COMMANDS:
    monitor         Run performance monitoring and generate report
    realtime       Real-time monitoring dashboard
    report         Generate report from existing data files

OPTIONS:
    -d, --duration SECONDS     Monitoring duration (default: 3600)
    -i, --interval SECONDS     Sample interval (default: 30)
    -u, --url URL             Base URL (default: http://localhost:4000)
    -o, --output DIR          Output directory for logs and reports
    -h, --help                Show this help

EXAMPLES:
    $0 monitor                              # Monitor for 1 hour
    $0 monitor -d 1800 -i 60               # Monitor for 30 min, sample every minute
    $0 realtime                            # Real-time dashboard
    $0 report --input logs/system_metrics_*.csv   # Generate report from existing data

EOF
}

# Parse arguments
COMMAND=""
while [[ $# -gt 0 ]]; do
    case $1 in
        monitor|realtime|report)
            COMMAND="$1"
            shift
            ;;
        -d|--duration)
            MONITOR_DURATION="$2"
            shift 2
            ;;
        -i|--interval)
            SAMPLE_INTERVAL="$2"
            shift 2
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -o|--output)
            LOG_DIR="$2/logs"
            REPORT_DIR="$2/reports"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Default command
if [ -z "$COMMAND" ]; then
    COMMAND="monitor"
fi

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
    command -v bc >/dev/null 2>&1 || missing_deps+=("bc")
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

# Main execution
main() {
    check_dependencies
    
    case "$COMMAND" in
        monitor)
            monitor_performance "$MONITOR_DURATION" "$SAMPLE_INTERVAL"
            ;;
        realtime)
            real_time_monitor
            ;;
        report)
            log_error "Report generation from existing data not yet implemented"
            exit 1
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Handle Ctrl+C gracefully
trap 'echo; log_info "Monitoring stopped by user"; exit 0' INT

# Run main function
main "$@"
