const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test configuration
const testCloudinaryConnection = async () => {
  try {
    await cloudinary.api.ping();
    console.log('Cloudinary connection successful');
    return true;
  } catch (error) {
    console.error('Cloudinary connection failed:', error.message);
    return false;
  }
};

module.exports = {
  cloudinary,
  testCloudinaryConnection,
};
