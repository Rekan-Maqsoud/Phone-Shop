#!/bin/bash

# Appwrite Quick Setup Script for Phone Shop Backup System
# This script helps you set up the required Appwrite collections and permissions

echo "========================================"
echo "Phone Shop - Appwrite Setup Helper"
echo "========================================"
echo ""

# Check if required environment variables are set
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.example to .env and configure your Appwrite settings first."
    exit 1
fi

# Load environment variables
source .env

# Check if all required variables are set
required_vars=("VITE_APPWRITE_ENDPOINT" "VITE_APPWRITE_PROJECT_ID" "VITE_APPWRITE_DATABASE_ID")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"your_"* ]]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing or incomplete environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please update your .env file with your actual Appwrite configuration."
    echo "See CLOUD_BACKUP_SETUP.md for detailed setup instructions."
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Check if Appwrite CLI is installed
if ! command -v appwrite &> /dev/null; then
    echo "📦 Appwrite CLI not found. Installing..."
    npm install -g appwrite-cli
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Appwrite CLI"
        echo "Please install it manually: npm install -g appwrite-cli"
        exit 1
    fi
fi

echo "✅ Appwrite CLI available"
echo ""

# Login to Appwrite
echo "🔐 Please login to your Appwrite account..."
appwrite login

if [ $? -ne 0 ]; then
    echo "❌ Failed to login to Appwrite"
    exit 1
fi

echo "✅ Successfully logged in to Appwrite"
echo ""

# Set the project
echo "🔧 Setting up project context..."
appwrite client --endpoint "$VITE_APPWRITE_ENDPOINT" --projectId "$VITE_APPWRITE_PROJECT_ID"

# Create database (if it doesn't exist)
echo "📊 Creating database..."
appwrite databases create --databaseId "$VITE_APPWRITE_DATABASE_ID" --name "phone-shop-backups"

# Create collection
echo "📋 Creating backups collection..."
appwrite databases createCollection \
    --databaseId "$VITE_APPWRITE_DATABASE_ID" \
    --collectionId "$VITE_APPWRITE_BACKUPS_COLLECTION_ID" \
    --name "backups" \
    --permissions "read(\"user:*\")" "create(\"user:*\")" "update(\"user:*\")" "delete(\"user:*\")"

# Create collection attributes
echo "🏗️  Creating collection attributes..."

# userId attribute
appwrite databases createStringAttribute \
    --databaseId "$VITE_APPWRITE_DATABASE_ID" \
    --collectionId "$VITE_APPWRITE_BACKUPS_COLLECTION_ID" \
    --key "userId" \
    --size 255 \
    --required true

# fileName attribute
appwrite databases createStringAttribute \
    --databaseId "$VITE_APPWRITE_DATABASE_ID" \
    --collectionId "$VITE_APPWRITE_BACKUPS_COLLECTION_ID" \
    --key "fileName" \
    --size 255 \
    --required true

# description attribute
appwrite databases createStringAttribute \
    --databaseId "$VITE_APPWRITE_DATABASE_ID" \
    --collectionId "$VITE_APPWRITE_BACKUPS_COLLECTION_ID" \
    --key "description" \
    --size 1000 \
    --required false

# fileId attribute
appwrite databases createStringAttribute \
    --databaseId "$VITE_APPWRITE_DATABASE_ID" \
    --collectionId "$VITE_APPWRITE_BACKUPS_COLLECTION_ID" \
    --key "fileId" \
    --size 255 \
    --required true

# fileSize attribute
appwrite databases createIntegerAttribute \
    --databaseId "$VITE_APPWRITE_DATABASE_ID" \
    --collectionId "$VITE_APPWRITE_BACKUPS_COLLECTION_ID" \
    --key "fileSize" \
    --required true \
    --min 0

# uploadDate attribute
appwrite databases createStringAttribute \
    --databaseId "$VITE_APPWRITE_DATABASE_ID" \
    --collectionId "$VITE_APPWRITE_BACKUPS_COLLECTION_ID" \
    --key "uploadDate" \
    --size 255 \
    --required true

# version attribute
appwrite databases createIntegerAttribute \
    --databaseId "$VITE_APPWRITE_DATABASE_ID" \
    --collectionId "$VITE_APPWRITE_BACKUPS_COLLECTION_ID" \
    --key "version" \
    --required true \
    --min 1 \
    --default 1

# Create storage bucket
echo "💾 Creating storage bucket..."
appwrite storage createBucket \
    --bucketId "$VITE_APPWRITE_BACKUP_BUCKET_ID" \
    --name "backup-files" \
    --permissions "read(\"user:*\")" "create(\"user:*\")" "update(\"user:*\")" "delete(\"user:*\")" \
    --fileSecurity true \
    --enabled true \
    --maximumFileSize 104857600 \
    --encryption true \
    --antivirus true

echo ""
echo "========================================"
echo "✅ Appwrite setup completed successfully!"
echo "========================================"
echo ""
echo "Your Phone Shop cloud backup system is now ready to use."
echo ""
echo "Next steps:"
echo "1. Restart your application"
echo "2. Test the cloud backup functionality"
echo "3. Create your first user account in the app"
echo ""
echo "Need help? Check CLOUD_BACKUP_SETUP.md for detailed documentation."
