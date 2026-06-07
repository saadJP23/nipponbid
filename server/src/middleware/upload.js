const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v2: cloudinary } = require('cloudinary');

// Configure Cloudinary (reads CLOUDINARY_URL env var automatically, or manual config)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const useCloudinary = () => !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);

// ─── Local disk storage (dev / fallback) ────────────────────────────────────
const makeStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../../uploads', folder);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

// ─── Cloudinary upload helper ────────────────────────────────────────────────
/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {string} folder  e.g. 'nipponbid/documents'
 * @param {string} originalname
 * @param {string} mimetype
 * @returns {Promise<string>} secure_url
 */
async function uploadToCloudinary(buffer, folder, originalname, mimetype) {
  const resourceType = mimetype.startsWith('image/') ? 'image' : 'raw';
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
        use_filename: false,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// ─── Filters ─────────────────────────────────────────────────────────────────
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files allowed'), false);
};

const docFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'application/pdf',
    'application/zip', 'application/x-zip-compressed',
    'application/x-zip', 'application/octet-stream',
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only images, PDFs, and ZIP files allowed'), false);
};

// ─── Multer instances ─────────────────────────────────────────────────────────
// When Cloudinary is configured we use memoryStorage so we can stream to cloud.
// Otherwise fall back to disk (local dev).
const memoryStorage = multer.memoryStorage();

const uploadCarImages = useCloudinary()
  ? multer({ storage: memoryStorage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } })
  : multer({ storage: makeStorage('car-images'), fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const uploadJapanCarImages = useCloudinary()
  ? multer({ storage: memoryStorage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } })
  : multer({ storage: makeStorage('japan-car-images'), fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const uploadDocument = useCloudinary()
  ? multer({ storage: memoryStorage, fileFilter: docFilter, limits: { fileSize: 20 * 1024 * 1024 } })
  : multer({ storage: makeStorage('documents'), fileFilter: docFilter, limits: { fileSize: 20 * 1024 * 1024 } });

// ─── Route helper: resolve file path after upload ────────────────────────────
/**
 * After multer processes a file, get its stored path/URL.
 * - Cloudinary mode: uploads buffer to cloud, returns HTTPS URL.
 * - Disk mode: returns local /uploads/... path.
 */
async function resolveUploadedFile(file, cloudFolder) {
  if (!file) return null;
  if (useCloudinary()) {
    return await uploadToCloudinary(file.buffer, cloudFolder, file.originalname, file.mimetype);
  }
  // Local disk — build the same path the proxy expects
  const folderName = cloudFolder.split('/').pop(); // e.g. 'documents'
  return `/uploads/${folderName}/${file.filename}`;
}

async function resolveUploadedFiles(files, cloudFolder) {
  if (!files?.length) return [];
  return Promise.all(files.map(f => resolveUploadedFile(f, cloudFolder)));
}

module.exports = {
  uploadCarImages,
  uploadJapanCarImages,
  uploadDocument,
  resolveUploadedFile,
  resolveUploadedFiles,
  useCloudinary,
};
