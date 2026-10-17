import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (fileStrOrBuffer) => {
  if (!fileStrOrBuffer) return '';
  
  // If already a remote http/https URL, return as-is
  if (typeof fileStrOrBuffer === 'string' && fileStrOrBuffer.startsWith('http')) {
    return fileStrOrBuffer;
  }
  
  const result = await cloudinary.uploader.upload(fileStrOrBuffer, {
    folder: 'FoodExpress',
  });
  
  return result.secure_url;
};

export { cloudinary };