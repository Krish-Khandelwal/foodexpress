import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isCloudinaryConfigured = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  return (
    Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) &&
    CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    CLOUDINARY_API_KEY !== 'your_api_key'
  );
};

// Removes the temporary file from backend/public after Cloudinary upload
const removeLocalFile = (localFilePath) => {
  try {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  } catch (err) {
    console.error('Failed to delete temp file from public folder:', err.message);
  }
};

export const uploadToCloudinary = async (localFilePathOrUrl) => {
  if (!localFilePathOrUrl) return '';

  // If already a remote http/https URL, return as-is
  if (typeof localFilePathOrUrl === 'string' && localFilePathOrUrl.startsWith('http')) {
    return localFilePathOrUrl;
  }

  // Fallback if Cloudinary keys are not configured in .env: serve directly from backend/public
  if (!isCloudinaryConfigured()) {
    if (fs.existsSync(localFilePathOrUrl)) {
      const fileName = path.basename(localFilePathOrUrl);
      const port = process.env.PORT || 5000;
      return `http://localhost:${port}/public/${fileName}`;
    }
    return typeof localFilePathOrUrl === 'string' ? localFilePathOrUrl : '';
  }

  try {
    // Upload the file from backend/public to Cloudinary
    const result = await cloudinary.uploader.upload(localFilePathOrUrl, {
      folder: 'FoodExpress',
      resource_type: 'auto',
    });

    // Clean up local file from backend/public after successful upload
    removeLocalFile(localFilePathOrUrl);

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed:', error.message);
    removeLocalFile(localFilePathOrUrl);
    return '';
  }
};

export { cloudinary };