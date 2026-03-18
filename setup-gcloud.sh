#!/bin/bash
set -e

PROJECT_ID="oktamam-ai-platform"
REGION="me-central1"
SERVICE_NAME="mrcodeai"
SA_NAME="github-deploy"

echo "============================================"
echo "  MrCode AI - Google Cloud Setup Script"
echo "============================================"
echo ""

gcloud config set project $PROJECT_ID

echo "[1/5] Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com

echo "[2/5] Creating Artifact Registry..."
gcloud artifacts repositories create $SERVICE_NAME \
  --repository-format=docker \
  --location=$REGION \
  --description="MrCode AI Docker images" \
  2>/dev/null || echo "  -> Already exists, skipping."

echo "[3/5] Creating Service Account..."
gcloud iam service-accounts create $SA_NAME \
  --display-name="GitHub Deploy" \
  2>/dev/null || echo "  -> Already exists, skipping."

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "[4/5] Assigning permissions..."
for ROLE in "roles/run.admin" "roles/artifactregistry.writer" "roles/iam.serviceAccountUser" "roles/secretmanager.secretAccessor"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$ROLE" \
    --quiet > /dev/null 2>&1
  echo "  -> Assigned $ROLE"
done

echo "[5/5] Generating key file..."
gcloud iam service-accounts keys create ~/key.json \
  --iam-account=$SA_EMAIL

echo ""
echo "============================================"
echo "  DONE! Now copy the key below:"
echo "============================================"
echo ""
cat ~/key.json
echo ""
echo "============================================"
echo "  Copy EVERYTHING above (between the { })"
echo "  and paste it as GCP_SA_KEY secret in GitHub"
echo "============================================"
