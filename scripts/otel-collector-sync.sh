#!/usr/bin/env bash
# Resolves the Collector image Docker Compose actually uses — pulls the
# exact prebuilt image if CI already built this exact code, otherwise
# builds it locally. See ADR-00019 for why this is an explicit script
# rather than relying on Docker Compose's own pull_policy+build
# interaction (real, documented inconsistencies there).
#
# Either path tags its result to the one stable local name Compose
# references with pull_policy: never — this script has already made the
# decision by the time `docker compose up` runs, so Compose doesn't need
# to make it again.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

IMAGE="ghcr.io/bdavi/starter-otel-collector"
LOCAL_TAG="starter-otel-collector:local"
SERVICE_DIR="services/otel-collector"

DIRTY=$(git status --porcelain -- "$SERVICE_DIR")
if [[ -n "$DIRTY" ]]; then
  echo "Uncommitted changes under $SERVICE_DIR — building locally (no pushed image could reflect this):"
  echo "$DIRTY"
  docker build -t "$LOCAL_TAG" "$SERVICE_DIR"
  exit 0
fi

if ! git rev-parse -q --verify "HEAD:$SERVICE_DIR" >/dev/null; then
  echo "$SERVICE_DIR has never been committed — building locally"
  docker build -t "$LOCAL_TAG" "$SERVICE_DIR"
  exit 0
fi

TREE_HASH=$(git rev-parse "HEAD:$SERVICE_DIR")
echo "Looking for a prebuilt image matching $TREE_HASH ..."

if docker pull "$IMAGE:$TREE_HASH" 2>/dev/null; then
  docker tag "$IMAGE:$TREE_HASH" "$LOCAL_TAG"
  echo "Pulled and tagged $LOCAL_TAG from $IMAGE:$TREE_HASH"
else
  echo "No prebuilt image for this exact commit yet (CI hasn't built it, or it's not pushed) — building locally"
  docker build -t "$LOCAL_TAG" "$SERVICE_DIR"
fi
