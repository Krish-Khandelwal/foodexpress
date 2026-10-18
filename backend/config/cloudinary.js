import { v2 as cloudinary } from 'cloudinary';
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

export const uploadToCloudinary = async (fileStrOrBuffer) => {
  if (!fileStrOrBuffer) return '';

  // If already a remote http/https URL, return as-is
  if (typeof fileStrOrBuffer === 'string' && fileStrOrBuffer.startsWith('http')) {
    return fileStrOrBuffer;
  }

  // Fallback to base64 data URI if Cloudinary is not configured in .env
  if (!isCloudinaryConfigured()) {
    return typeof fileStrOrBuffer === 'string' ? fileStrOrBuffer : '';
  }

  try {
    const result = await cloudinary.uploader.upload(fileStrOrBuffer, {
      folder: 'FoodExpress',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed, falling back to local data URI:', error.message);
    return typeof fileStrOrBuffer === 'string' ? fileStrOrBuffer : '';
  }
};

export { cloudinary };