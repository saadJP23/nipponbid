const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files allowed'), false);
};

const docFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only images and PDFs allowed'), false);
};

const uploadCarImages = multer({ storage: makeStorage('car-images'), fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadDocument = multer({ storage: makeStorage('documents'), fileFilter: docFilter, limits: { fileSize: 20 * 1024 * 1024 } });

module.exports = { uploadCarImages, uploadDocument };
