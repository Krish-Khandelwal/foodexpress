import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const removeLocalFile = (localFilePath) => {
  try {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  } catch (err) {
    console.error('Failed to delete temp file:', err.message);
  }
};

export const uploadToCloudinary = async (localFilePathOrUrl) => {
  if (!localFilePathOrUrl) return '';

  if (typeof localFilePathOrUrl === 'string' && localFilePathOrUrl.startsWith('http')) {
    return localFilePathOrUrl;
  }

  try {
    const result = await cloudinary.uploader.upload(localFilePathOrUrl, {
      folder: 'FoodExpress',
      resource_type: 'auto',
    });

    removeLocalFile(localFilePathOrUrl);
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed:', error.message);
    removeLocalFile(localFilePathOrUrl);
    return '';
  }
};