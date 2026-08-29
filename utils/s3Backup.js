import { 
  S3Client, 
  PutObjectCommand, 
  ListObjectsV2Command, 
  GetObjectCommand, 
  DeleteObjectCommand,
  DeleteObjectsCommand 
} from '@aws-sdk/client-s3';
import zlib from 'zlib';
import dotenv from 'dotenv';
import JSZip from 'jszip';

import AccountLedger from '../model/accountLedgerModel.js';
import Admin from '../model/adminModel.js';
import AdminNotification from '../model/adminNotificationModel.js';
import Banner from '../model/bannerModel.js';
import Cart from '../model/cartModel.js';
import Category from '../model/categoryModel.js';
import Charge from '../model/chargeModel.js';
import Customer from '../model/customerModel.js';
import DeliveryPartner from '../model/deliveryPartnerModel.js';
import DeliverySlot from '../model/deliverySlotModel.js';
import Director from '../model/directorModel.js';
import Employee from '../model/employeeModel.js';
import FixedAsset from '../model/fixedAssetModel.js';
import GST from '../model/gstModel.js';
import JournalEntry from '../model/journalEntryModel.js';
import Order from '../model/orderModel.js';
import Payroll from '../model/payrollModel.js';
import Pincode from '../model/pincodeModel.js';
import Product from '../model/productModel.js';
import Purchase from '../model/purchaseModel.js';
import Setting from '../model/settingModel.js';
import Shareholder from '../model/shareholderModel.js';
import StockAdjustment from '../model/stockAdjustmentModel.js';
import Vendor from '../model/vendorModel.js';

dotenv.config();

export const modelsMap = {
  AccountLedger,
  Admin,
  AdminNotification,
  Banner,
  Cart,
  Category,
  Charge,
  Customer,
  DeliveryPartner,
  DeliverySlot,
  Director,
  Employee,
  FixedAsset,
  GST,
  JournalEntry,
  Order,
  Payroll,
  Pincode,
  Product,
  Purchase,
  Setting,
  Shareholder,
  StockAdjustment,
  Vendor
};

const getS3Client = () => {
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const BACKUP_PREFIX = process.env.S3_BACKUP_PREFIX || 'backups/db/';

/**
 * Creates a gzipped JSON backup of all MongoDB collections and uploads to S3.
 * Also triggers automated cleanup of backups older than retentionDays.
 */
export const createAndUploadS3Backup = async (retentionDays = 30) => {
  try {
    const s3Client = getS3Client();
    const backupDate = new Date();
    const timestampStr = backupDate.toISOString().replace(/[:.]/g, '-');
    const s3Key = `${BACKUP_PREFIX}grocmed_backup_${timestampStr}.json.gz`;

    const backupData = {
      version: '1.0.0',
      backupDate: backupDate.toISOString(),
      data: {}
    };

    let totalDocuments = 0;
    const summary = {};

    for (const [modelName, Model] of Object.entries(modelsMap)) {
      const docs = await Model.find().lean();
      backupData.data[modelName] = docs;
      summary[modelName] = docs.length;
      totalDocuments += docs.length;
    }

    const jsonString = JSON.stringify(backupData);
    const uncompressedSize = Buffer.byteLength(jsonString, 'utf-8');
    const compressedBuffer = zlib.gzipSync(Buffer.from(jsonString, 'utf-8'));
    const compressedSize = compressedBuffer.length;

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: compressedBuffer,
      ContentType: 'application/gzip',
      ContentEncoding: 'gzip',
      Metadata: {
        'backup-version': '1.0.0',
        'backup-date': backupDate.toISOString(),
        'total-documents': String(totalDocuments),
        'uncompressed-size': String(uncompressedSize)
      }
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    // Clean up backups older than retentionDays
    let prunedCount = 0;
    try {
      prunedCount = await cleanOldS3Backups(retentionDays);
    } catch (cleanupErr) {
      console.warn('Warning: Failed to clean up old S3 backups during backup routine:', cleanupErr.message);
    }

    return {
      success: true,
      s3Key,
      s3Url,
      bucket: BUCKET_NAME,
      backupDate: backupDate.toISOString(),
      uncompressedSizeBytes: uncompressedSize,
      compressedSizeBytes: compressedSize,
      compressionRatio: `${((1 - compressedSize / uncompressedSize) * 100).toFixed(2)}%`,
      totalCollections: Object.keys(modelsMap).length,
      totalDocuments,
      summary,
      prunedOldBackupsCount: prunedCount
    };
  } catch (error) {
    console.error('S3 Backup Creation Error:', error);
    throw new Error(`Failed to create and upload S3 backup: ${error.message}`);
  }
};

/**
 * Lists all database backup files stored in S3 under BACKUP_PREFIX.
 */
export const listS3Backups = async () => {
  try {
    const s3Client = getS3Client();
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: BACKUP_PREFIX,
    });

    const response = await s3Client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    const backups = response.Contents
      .filter((obj) => obj.Key.endsWith('.json.gz') || obj.Key.endsWith('.json'))
      .map((obj) => {
        const sizeBytes = obj.Size || 0;
        const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
        return {
          key: obj.Key,
          filename: obj.Key.replace(BACKUP_PREFIX, ''),
          sizeBytes,
          sizeFormatted: sizeBytes > 1024 * 1024 ? `${sizeMB} MB` : `${(sizeBytes / 1024).toFixed(2)} KB`,
          lastModified: obj.LastModified,
          eTag: obj.ETag
        };
      })
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    return backups;
  } catch (error) {
    console.error('S3 Backup List Error:', error);
    throw new Error(`Failed to list S3 backups: ${error.message}`);
  }
};

/**
 * Restores database from a compressed or plain JSON backup file in S3.
 */
export const restoreFromS3Backup = async (s3Key) => {
  try {
    const s3Client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    const byteArray = await response.Body.transformToByteArray();
    const buffer = Buffer.from(byteArray);

    let jsonString;
    if (s3Key.endsWith('.gz')) {
      jsonString = zlib.gunzipSync(buffer).toString('utf-8');
    } else {
      jsonString = buffer.toString('utf-8');
    }

    const backupData = JSON.parse(jsonString);

    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup file content: missing "data" key');
    }

    // Validate that all collections match known models
    for (const modelName of Object.keys(backupData.data)) {
      if (!modelsMap[modelName]) {
        throw new Error(`Unknown collection model "${modelName}" found in backup file`);
      }
    }

    const restoreSummary = {};

    for (const [modelName, documents] of Object.entries(backupData.data)) {
      const Model = modelsMap[modelName];

      // Clear existing records
      await Model.deleteMany({});

      if (documents && documents.length > 0) {
        // Restore documents preserving original timestamps and ObjectIds
        await Model.insertMany(documents, { timestamps: false });
      }

      restoreSummary[modelName] = documents ? documents.length : 0;
    }

    return {
      success: true,
      message: 'Database successfully restored from S3 backup',
      s3Key,
      backupDate: backupData.backupDate,
      summary: restoreSummary
    };
  } catch (error) {
    console.error('S3 Backup Restore Error:', error);
    throw new Error(`Failed to restore database from S3 backup: ${error.message}`);
  }
};

/**
 * Deletes a specific backup object from S3.
 */
export const deleteS3Backup = async (s3Key) => {
  try {
    const s3Client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 Backup Deletion Error:', error);
    throw new Error(`Failed to delete S3 backup: ${error.message}`);
  }
};

/**
 * Removes S3 backups under BACKUP_PREFIX that are older than retentionDays.
 */
export const cleanOldS3Backups = async (retentionDays = 30) => {
  try {
    const s3Client = getS3Client();
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: BACKUP_PREFIX,
    });

    const response = await s3Client.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const expiredObjects = response.Contents
      .filter((obj) => new Date(obj.LastModified) < cutoffDate)
      .map((obj) => ({ Key: obj.Key }));

    if (expiredObjects.length === 0) {
      return 0;
    }

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: expiredObjects,
        Quiet: true,
      },
    });

    await s3Client.send(deleteCommand);
    console.log(`Pruned ${expiredObjects.length} S3 backup(s) older than ${retentionDays} days.`);
    return expiredObjects.length;
  } catch (error) {
    console.error('S3 Backup Retention Cleanup Error:', error);
    throw error;
  }
};

/**
 * Downloads all uploaded images across Products, Categories, Banners, and Settings,
 * bundles them into a zip archive categorized by folder, and streams it to HTTP response.
 */
export const downloadAllS3ImagesZipService = async (res) => {
  const zip = new JSZip();

  const fetchImageBuffer = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      console.warn(`Failed to fetch image for zip backup: ${url}`, err.message);
      return null;
    }
  };

  const sanitizeFilename = (str) => {
    return (str || '').replace(/[^a-zA-Z0-9._-]/g, '_');
  };

  // 1. Products Images
  const products = await Product.find({}).select('name images').lean();
  for (const p of products) {
    if (p.images && p.images.length > 0) {
      for (let i = 0; i < p.images.length; i++) {
        const imgUrl = p.images[i];
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
          const buffer = await fetchImageBuffer(imgUrl);
          if (buffer) {
            const ext = imgUrl.split('.').pop().split('?')[0] || 'jpg';
            const fileName = `products/${sanitizeFilename(p.name || 'product')}_${p._id}_img${i + 1}.${ext}`;
            zip.file(fileName, buffer);
          }
        }
      }
    }
  }

  // 2. Categories Images
  const categories = await Category.find({}).select('name image').lean();
  for (const c of categories) {
    if (c.image && typeof c.image === 'string' && c.image.startsWith('http')) {
      const buffer = await fetchImageBuffer(c.image);
      if (buffer) {
        const ext = c.image.split('.').pop().split('?')[0] || 'jpg';
        const fileName = `categories/${sanitizeFilename(c.name || 'category')}_${c._id}.${ext}`;
        zip.file(fileName, buffer);
      }
    }
  }

  // 3. Banners Images
  const banners = await Banner.find({}).select('title image desktopImage mobileImage').lean();
  for (const b of banners) {
    const urls = [b.image, b.desktopImage, b.mobileImage].filter(u => u && typeof u === 'string' && u.startsWith('http'));
    for (let i = 0; i < urls.length; i++) {
      const buffer = await fetchImageBuffer(urls[i]);
      if (buffer) {
        const ext = urls[i].split('.').pop().split('?')[0] || 'jpg';
        const fileName = `banners/${sanitizeFilename(b.title || 'banner')}_${b._id}_${i + 1}.${ext}`;
        zip.file(fileName, buffer);
      }
    }
  }

  // 4. Settings Images
  const settings = await Setting.find({}).select('paymentQrUrl logoUrl').lean();
  for (const s of settings) {
    if (s.paymentQrUrl && typeof s.paymentQrUrl === 'string' && s.paymentQrUrl.startsWith('http')) {
      const buffer = await fetchImageBuffer(s.paymentQrUrl);
      if (buffer) {
        const ext = s.paymentQrUrl.split('.').pop().split('?')[0] || 'jpg';
        zip.file(`settings/payment_qr_code.${ext}`, buffer);
      }
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  res.attachment(`grocmed_all_s3_images_${new Date().toISOString().slice(0, 10)}.zip`);
  res.setHeader('Content-Type', 'application/zip');
  res.send(zipBuffer);
};
