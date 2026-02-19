#!/usr/bin/env bash
# =============================================================================
# Developer Environment Setup Script
#
# Run this on every engineer's machine to get a consistent dev environment.
# Usage: ./scripts/setup-dev-environment.sh
# =============================================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; }

echo -e "${BOLD}🚀 MyApp Developer Environment Setup${NC}\n"

# ---- Check Prerequisites ----
echo -e "${BOLD}Checking prerequisites...${NC}"

check_cmd() {
  if command -v "$1" &> /dev/null; then
    log "$1 found: $(command -v "$1")"
    return 0
  else
    err "$1 not found"
    return 1
  fi
}

MISSING=0

check_cmd docker     || MISSING=1
check_cmd kubectl    || MISSING=1
check_cmd git        || MISSING=1

# Optional but recommended tools
check_cmd kustomize  || warn "Install kustomize: https://kubectl.docs.kubernetes.io/installation/kustomize/"
check_cmd helm       || warn "Install helm: https://helm.sh/docs/intro/install/"
check_cmd k9s        || warn "Install k9s (recommended): https://k9scli.io/topics/install/"
check_cmd kubectx    || warn "Install kubectx (recommended): https://github.com/ahmetb/kubectx"

if [ "$MISSING" -eq 1 ]; then
  err "Required tools missing. Install them and re-run this script."
  exit 1
fi

# ---- Verify Docker is running ----
echo -e "\n${BOLD}Checking Docker...${NC}"
if docker info &> /dev/null; then
  log "Docker is running"
  docker version --format '   Server: {{.Server.Version}}, Client: {{.Client.Version}}'
else
  err "Docker is not running. Start Docker Desktop and try again."
  exit 1
fi

# ---- Clone and setup ----
echo -e "\n${BOLD}Setting up the project...${NC}"

if [ ! -f "docker-compose.yml" ]; then
  err "Run this script from the project root directory"
  exit 1
fi

# ---- Build and start local environment ----
echo -e "\n${BOLD}Building and starting local environment...${NC}"
echo "   This may take a few minutes on first run..."

docker compose build
docker compose up -d

# ---- Wait for services ----
echo -e "\n${BOLD}Waiting for services to be healthy...${NC}"

wait_for_service() {
  local name=$1
  local url=$2
  local max_attempts=30
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      log "$name is ready"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  err "$name failed to start"
  return 1
}

wait_for_service "Database"  "localhost:5432" || true
wait_for_service "Backend"   "http://localhost:8080/health"
wait_for_service "Frontend"  "http://localhost:3000"

# ---- Print summary ----
echo -e "\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🎉 Development environment is ready!${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8080"
echo "   API Docs:  http://localhost:8080/api/tasks"
echo "   Database:  localhost:5432 (myapp/myapp)"
echo ""
echo "   Useful commands:"
echo "   docker compose logs -f backend    # Follow backend logs"
echo "   docker compose logs -f frontend   # Follow frontend logs"
echo "   docker compose down               # Stop all services"
echo "   docker compose down -v            # Stop + remove data"
echo "   docker compose up --build         # Rebuild and start"
echo ""
