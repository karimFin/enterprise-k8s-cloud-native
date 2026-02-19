#!/usr/bin/env bash
# =============================================================================
# Provision namespaces for all developers
# Edit the DEVELOPERS array below with your team.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Format: "name email team"
DEVELOPERS=(
  "alice alice@company.com backend"
  "bob bob@company.com backend"
  "carol carol@company.com frontend"
  "dave dave@company.com frontend"
  "eve eve@company.com fullstack"
  "frank frank@company.com devops"
  # ... add up to 25 developers
)

echo "🏗️  Provisioning ${#DEVELOPERS[@]} developer namespaces..."
echo ""

for dev in "${DEVELOPERS[@]}"; do
  read -r name email team <<< "$dev"
  echo "━━━ Setting up ${name} ━━━"
  "${SCRIPT_DIR}/create-dev-namespace.sh" "$name" "$email" "$team"
  echo ""
done

echo "✅ All developer namespaces provisioned!"
echo ""
echo "📊 Summary:"
kubectl get namespaces -l purpose=development
