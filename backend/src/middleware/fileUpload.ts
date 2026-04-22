import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure temp upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Disk storage – keep original name for debugging, multer handles uniqueness via fieldname + timestamp
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// Allowed MIME types per upload type
const PDF_MIME_TYPES = ['application/pdf'];
const DOCX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

function createFileFilter(allowedMimes: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`));
    }
  };
}

// 50 MB limit (in bytes)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Multer instance for PDF uploads */
export const pdfUpload = multer({
  storage,
  fileFilter: createFileFilter(PDF_MIME_TYPES),
  limits: { fileSize: MAX_FILE_SIZE },
});

/** Multer instance for DOCX uploads */
export const docxUpload = multer({
  storage,
  fileFilter: createFileFilter(DOCX_MIME_TYPES),
  limits: { fileSize: MAX_FILE_SIZE },
});

export const UPLOAD_TEMP_DIR = UPLOAD_DIR;
