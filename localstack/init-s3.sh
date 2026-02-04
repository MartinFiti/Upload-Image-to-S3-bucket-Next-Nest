#!/bin/bash
# =============================================================================
# LocalStack S3 Initialization Script
# =============================================================================
# This script runs automatically when LocalStack starts.
# It creates the S3 bucket needed for the demo application.
#
# Note: We use curl to interact with LocalStack's API since the s3-latest
# image is minimal and doesn't include the awslocal CLI.
#
# With PERSISTENCE=1, data survives container restarts, so we check
# if the bucket already exists before creating it.
# =============================================================================

set -e

LOCALSTACK_HOST="http://localhost:4566"
BUCKET_NAME="demo-bucket"

echo "=============================================="
echo "Initializing LocalStack S3 bucket..."
echo "=============================================="

# Check if bucket already exists (from persisted data)
BUCKET_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" "${LOCALSTACK_HOST}/${BUCKET_NAME}" 2>/dev/null)

if [ "$BUCKET_EXISTS" = "200" ]; then
  echo "Bucket '${BUCKET_NAME}' already exists (restored from persistence)."
else
  # Create the demo bucket using LocalStack's S3 API
  # The bucket name should match AWS_BUCKET_NAME in your .env file
  curl -X PUT "${LOCALSTACK_HOST}/${BUCKET_NAME}" \
    -H "Content-Type: application/xml" \
    2>/dev/null

  echo "Bucket '${BUCKET_NAME}' created."
fi

# Configure CORS for the bucket (required for browser uploads)
# This allows the frontend to upload files directly to S3
CORS_CONFIG='<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>'

curl -X PUT "${LOCALSTACK_HOST}/${BUCKET_NAME}?cors" \
  -H "Content-Type: application/xml" \
  -d "${CORS_CONFIG}" \
  2>/dev/null

echo "CORS configuration applied."

echo "=============================================="
echo "S3 bucket '${BUCKET_NAME}' ready!"
echo "=============================================="
