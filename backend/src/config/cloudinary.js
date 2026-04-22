const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Delete a file from Cloudinary by public_id
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    console.error('[Cloudinary] Delete error:', error.message);
    throw error;
  }
};

/**
 * Extract public_id from a Cloudinary URL
 */
const extractPublicId = (url) => {
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    const startIndex = parts[uploadIndex + 1]?.startsWith('v') ? uploadIndex + 2 : uploadIndex + 1;
    const pathWithExt = parts.slice(startIndex).join('/');
    return pathWithExt.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
};

module.exports = { cloudinary, deleteFromCloudinary, extractPublicId };
