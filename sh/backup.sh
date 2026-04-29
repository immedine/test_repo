#!/bin/bash

# ===== CONFIG =====
MONGO_URI="mongodb+srv://Immedine:Immedine2025@cluster0.lojpvhk.mongodb.net/dev"
DB_NAME="dev"
S3_BUCKET="s3://immedine-bucket-2/mongo-backups"
BACKUP_DIR="/tmp/mongo-backup"

DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FOLDER="$BACKUP_DIR/$DATE"
ARCHIVE="$BACKUP_DIR/$DATE.tar.gz"

# ===== START =====
echo "Starting backup at $DATE"

# Create temp dir
mkdir -p $FOLDER

# Dump database
mongodump --uri="$MONGO_URI" --db="$DB_NAME" --out="$FOLDER"

# Compress backup
tar -czf "$ARCHIVE" -C "$BACKUP_DIR" "$DATE"

# Upload to S3
aws s3 cp "$ARCHIVE" "$S3_BUCKET/$DATE.tar.gz"

# Check upload success
if [ $? -eq 0 ]; then
  echo "Upload successful"
else
  echo "Upload failed"
  exit 1
fi

# Cleanup local files
rm -rf "$FOLDER"
rm -f "$ARCHIVE"

echo "Backup completed successfully"