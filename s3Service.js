const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const db = require('./database');

class S3Service {
  constructor() {
    this.client = null;
    this.config = null;
    this.initializeFromDb();
  }

  initializeFromDb() {
    const stmt = db.prepare('SELECT * FROM s3_config ORDER BY id DESC LIMIT 1');
    const config = stmt.get();
    
    if (config) {
      this.config = config;
      this.client = new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        credentials: {
          accessKeyId: config.access_key_id,
          secretAccessKey: config.secret_access_key
        },
        forcePathStyle: true
      });
    }
  }

  isConfigured() {
    return this.client !== null && this.config !== null;
  }

  getConfig() {
    return this.config ? {
      endpoint: this.config.endpoint,
      region: this.config.region,
      bucket: this.config.bucket,
      publicUrlPrefix: this.config.public_url_prefix
    } : null;
  }

  saveConfig(endpoint, region, bucket, accessKeyId, secretAccessKey, publicUrlPrefix) {
    const stmt = db.prepare(`
      INSERT INTO s3_config (endpoint, region, bucket, access_key_id, secret_access_key, public_url_prefix)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(endpoint, region, bucket, accessKeyId, secretAccessKey, publicUrlPrefix || '');
    
    this.initializeFromDb();
    
    return true;
  }

  async listImages() {
    if (!this.isConfigured()) {
      throw new Error('S3 not configured');
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket
      });

      const response = await this.client.send(command);
      
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      const images = (response.Contents || [])
        .filter(item => {
          const ext = item.Key.toLowerCase().substring(item.Key.lastIndexOf('.'));
          return imageExtensions.includes(ext);
        })
        .map(item => ({
          key: item.Key,
          name: item.Key.split('/').pop(),
          size: item.Size,
          lastModified: item.LastModified,
          url: this.getPublicUrl(item.Key)
        }));

      return images;
    } catch (error) {
      console.error('Error listing images:', error);
      throw error;
    }
  }

  async uploadImage(fileBuffer, fileName) {
    if (!this.isConfigured()) {
      throw new Error('S3 not configured');
    }

    try {
      const existingImages = await this.listImages();
      let finalFileName = fileName;
      let counter = 1;

      while (existingImages.some(img => img.key === finalFileName)) {
        const nameParts = fileName.split('.');
        const ext = nameParts.pop();
        const baseName = nameParts.join('.');
        finalFileName = `${baseName}_${counter}.${ext}`;
        counter++;
      }

      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: finalFileName,
        Body: fileBuffer,
        ContentType: this.getContentType(finalFileName)
      });

      await this.client.send(command);

      return {
        key: finalFileName,
        name: finalFileName,
        url: this.getPublicUrl(finalFileName)
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  getPublicUrl(key) {
    if (this.config.public_url_prefix) {
      return `${this.config.public_url_prefix}/${key}`;
    }
    
    let endpoint = this.config.endpoint;
    if (endpoint.endsWith('/')) {
      endpoint = endpoint.slice(0, -1);
    }
    
    return `${endpoint}/${this.config.bucket}/${key}`;
  }

  getContentType(fileName) {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  async deleteImage(key) {
    if (!this.isConfigured()) {
      throw new Error('S3 not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }
}

module.exports = new S3Service();
