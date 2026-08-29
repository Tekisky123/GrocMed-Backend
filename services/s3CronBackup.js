import { createAndUploadS3Backup } from '../utils/s3Backup.js';

let cronTimer = null;

/**
 * Initializes automated background S3 database backup scheduler.
 * Runs once every INTERVAL_HOURS (default 24 hours).
 */
export const initS3CronBackup = () => {
  const intervalHours = parseInt(process.env.S3_BACKUP_INTERVAL_HOURS || '24', 10);
  const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
  const enabled = process.env.ENABLE_AUTO_S3_BACKUP !== 'false';

  if (!enabled) {
    console.log('[S3 Cron Backup] Automated S3 backups are disabled via ENABLE_AUTO_S3_BACKUP=false.');
    return;
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(`[S3 Cron Backup] Scheduled automated database backups to S3 every ${intervalHours} hour(s). Retention: ${retentionDays} days.`);

  // Function to execute backup with exception isolation
  const runScheduledBackup = async () => {
    console.log('[S3 Cron Backup] Starting scheduled automated S3 database backup...');
    try {
      const result = await createAndUploadS3Backup(retentionDays);
      console.log(`[S3 Cron Backup] Success! Created ${result.s3Key} (${result.compressedSizeBytes} bytes, compression ${result.compressionRatio}).`);
    } catch (error) {
      console.error('[S3 Cron Backup] Error executing scheduled automated S3 database backup:', error.message);
    }
  };

  // Schedule recurring timer
  if (cronTimer) {
    clearInterval(cronTimer);
  }

  cronTimer = setInterval(runScheduledBackup, intervalMs);
};

export const stopS3CronBackup = () => {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
    console.log('[S3 Cron Backup] Stopped background S3 backup scheduler.');
  }
};
