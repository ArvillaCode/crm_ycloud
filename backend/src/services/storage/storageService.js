const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const logger = require('../../config/logger');

class StorageService {
  constructor() {
    this.driver = process.env.STORAGE_DRIVER || 'local';
    this.bucket = process.env.S3_BUCKET;
    this.publicUrl = process.env.S3_PUBLIC_URL;
    
    if (this.driver === 's3') {
      const endpoint = process.env.S3_ENDPOINT;
      const accessKeyId = process.env.S3_ACCESS_KEY_ID;
      const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

      if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucket) {
        logger.warn('[Storage] Missing S3/R2 variables. Falling back to local storage driver.');
        this.driver = 'local';
      } else {
        this.s3 = new S3Client({
          endpoint,
          region: 'auto', // Standard for Cloudflare R2
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          forcePathStyle: true, // Necessary for custom endpoints/MinIO/R2
        });
        logger.info('[Storage] Cloudflare R2/S3 client initialized successfully.');
      }
    }
  }

  /**
   * Upload file buffer to target storage provider
   * @param {Buffer} buffer - File buffer content
   * @param {string} filename - Target file name
   * @param {string} mimeType - File MIME type
   * @returns {Promise<string>} File public URL
   */
  async upload(buffer, filename, mimeType) {
    if (this.driver === 's3' && this.s3) {
      try {
        const key = `uploads/${Date.now()}_${filename.replace(/\s+/g, '_')}`;
        await this.s3.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }));
        
        const fileUrl = this.publicUrl 
          ? `${this.publicUrl}/${key}`
          : `${process.env.S3_ENDPOINT}/${this.bucket}/${key}`;
          
        logger.info(`[Storage] File uploaded to Cloud S3/R2 successfully`, { key });
        return fileUrl;
      } catch (error) {
        logger.error('[Storage] S3 upload error, falling back to local disk storage', error);
      }
    }

    // Local Disk Driver Fallback
    const uploadDir = path.join(__dirname, '../../../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const localFilename = `${Date.now()}_${filename.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadDir, localFilename);
    fs.writeFileSync(filePath, buffer);

    const devHost = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
    const fileUrl = `${devHost}/uploads/${localFilename}`;
    logger.info(`[Storage] File uploaded to local workspace disk successfully`, { filename: localFilename });
    return fileUrl;
  }
}

module.exports = new StorageService();
