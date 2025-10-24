#!/bin/bash
set -e

SERVICE="colorimetry-app"
IMAGE="europe-west1-docker.pkg.dev/idony-colorimetry/cloud-run-source-deploy/${SERVICE}:latest"
REGION="europe-west1"

echo "🚀 Starting deployment for ${SERVICE}..."

# 1️⃣ Check for local Git changes
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  You have uncommitted changes."
  read -p "Do you want to continue anyway? (y/N): " CONFIRM
  if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "❌ Deployment aborted."
    exit 1
  fi
else
  echo "✅ Git workspace clean."
fi

# 2️⃣ Check for build folder
if [ ! -d ".next" ]; then
  echo "❌ Build folder not found. Running npm run build..."
  npm run build
else
  echo "✅ Build folder found."
fi

# 3️⃣ Submit new image
echo "📦 Submitting image to Cloud Build..."
gcloud builds submit --tag "$IMAGE"

# 4️⃣ Deploy to Cloud Run
echo "🌍 Deploying service..."
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region="$REGION" \
  --platform managed \
  --allow-unauthenticated

# 5️⃣ Show deployed revision info
echo "🔍 Checking deployed revision..."
gcloud run services describe "$SERVICE" --region="$REGION" --format="value(status.latestReadyRevisionName)"

echo "✅ Deployment finished successfully!"