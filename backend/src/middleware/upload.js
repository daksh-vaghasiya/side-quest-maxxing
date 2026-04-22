const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');

// ── Submission media storage (images + videos) ─────────────────────────────────
const submissionStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    return {
      folder: 'side-quest-maxxing/submissions',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: isVideo ? ['mp4', 'mov', 'webm', 'avi'] : ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: isVideo
        ? [{ width: 1280, height: 720, crop: 'limit' }]
        : [{ width: 1920, height: 1080, crop: 'limit', quality: 'auto:good' }],
    };
  },
});

// ── Avatar storage (images only) ───────────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'side-quest-maxxing/avatars',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto:good' }],
  },
});

// ── Quest cover image storage ──────────────────────────────────────────────────
const questCoverStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'side-quest-maxxing/quest-covers',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 630, crop: 'fill', quality: 'auto:good' }],
  },
});

// ── Chat attachment storage (images/gifs) ──────────────────────────────────────
const chatAttachmentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'side-quest-maxxing/chat',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1080, height: 1080, crop: 'limit', quality: 'auto:good' }],
  },
});

// ── Multer instances ───────────────────────────────────────────────────────────
const uploadSubmissionMedia = multer({
  storage: submissionStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max per file
  fileFilter: (req, file, cb) => {
    const allowedMime = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
    ];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only images and videos are allowed.`));
    }
  },
}).array('media', 5); // Up to 5 files

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed for avatars.'));
  },
}).single('avatar');

const uploadQuestCover = multer({
  storage: questCoverStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed for quest covers.'));
  },
}).single('cover');

const uploadChatAttachment = multer({
  storage: chatAttachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images and gifs are allowed in chat.'));
  },
}).array('attachments', 5); // Up to 5 files

// ── Multer error handler wrapper ───────────────────────────────────────────────
const handleUpload = (uploader) => (req, res, next) => {
  uploader(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

module.exports = {
  uploadSubmissionMedia: handleUpload(uploadSubmissionMedia),
  uploadAvatar: handleUpload(uploadAvatar),
  uploadQuestCover: handleUpload(uploadQuestCover),
  uploadChatAttachment: handleUpload(uploadChatAttachment),
};
