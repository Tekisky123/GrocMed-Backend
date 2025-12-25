import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

export const uploadImageToS3 = async (file, folder = 'products') => {
  try {
    const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Return the public URL
    const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    return imageUrl;
  } catch (error) {
    throw new Error('Failed to upload image to S3');
  }
};

export const uploadMultipleImagesToS3 = async (files, folder = 'products') => {
  try {
    const uploadPromises = files.map((file) => uploadImageToS3(file, folder));
    const imageUrls = await Promise.all(uploadPromises);
    return imageUrls;
  } catch (error) {
    throw new Error('Failed to upload images to S3');
  }
};

export const deleteImageFromS3 = async (imageUrl) => {
  try {
    // Extract key from URL
    const urlParts = imageUrl.split('.com/');
    if (urlParts.length < 2) {
      throw new Error('Invalid image URL');
    }
    const key = urlParts[1];

    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
    return true;
  } catch (error) {
    throw new Error('Failed to delete image from S3');
  }
};

