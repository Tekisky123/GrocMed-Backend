import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createAndUploadS3Backup } from '../utils/s3Backup.js';

dotenv.config();

const runBackupScript = async () => {
  console.log('--- GrocMed S3 Database Backup CLI ---');

  if (!process.env.DB_URL) {
    console.error('Error: DB_URL is missing in environment variables.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('Database connected successfully.');

    console.log('Exporting collections & uploading compressed backup to AWS S3...');
    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
    const result = await createAndUploadS3Backup(retentionDays);

    console.log('\n--- Backup Completed Successfully ---');
    console.log(`S3 Key:               ${result.s3Key}`);
    console.log(`S3 URL:               ${result.s3Url}`);
    console.log(`Backup Date:          ${result.backupDate}`);
    console.log(`Uncompressed Size:    ${(result.uncompressedSizeBytes / 1024).toFixed(2)} KB`);
    console.log(`Compressed Size:      ${(result.compressedSizeBytes / 1024).toFixed(2)} KB (${result.compressionRatio} compression)`);
    console.log(`Total Collections:    ${result.totalCollections}`);
    console.log(`Total Documents:      ${result.totalDocuments}`);
    console.log(`Pruned Old Backups:   ${result.prunedOldBackupsCount}`);
    console.log('-------------------------------------\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Fatal S3 Backup Error:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

runBackupScript();
