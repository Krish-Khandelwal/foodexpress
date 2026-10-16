import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a base64 image string to Cloudinary.
 * @param {string} base64Image - Data URL (e.g. "data:image/jpeg;base64,...")
 * @returns {Promise<string>} - The secure Cloudinary URL
 */
export const uploadImage = async (base64Image) => {
  const result = await cloudinary.uploader.upload(base64Image, {
    folder: 'quickbite/menu',
    transformation: [
      { width: 800, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
    ]
  });
  return result.secure_url;
};

export default cloudinary;
