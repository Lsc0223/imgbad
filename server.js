const express = require('express');
const fileUpload = require('express-fileupload');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const s3Service = require('./s3Service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  try {
    const config = s3Service.getConfig();
    if (config) {
      res.json({ configured: true, config });
    } else {
      res.json({ configured: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const { endpoint, region, bucket, accessKeyId, secretAccessKey, publicUrlPrefix } = req.body;
    
    if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    s3Service.saveConfig(endpoint, region, bucket, accessKeyId, secretAccessKey, publicUrlPrefix);
    
    res.json({ success: true, message: 'S3 configuration saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/images', async (req, res) => {
  try {
    if (!s3Service.isConfigured()) {
      return res.status(400).json({ error: 'S3 not configured' });
    }

    const images = await s3Service.listImages();
    res.json({ images });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', async (req, res) => {
  try {
    if (!s3Service.isConfigured()) {
      return res.status(400).json({ error: 'S3 not configured' });
    }

    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imageFile = req.files.image;
    const originalName = imageFile.name;
    
    const ext = path.extname(originalName).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
    }

    let processedBuffer;
    
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      const sharpInstance = sharp(imageFile.data);
      const metadata = await sharpInstance.metadata();
      
      if (ext === '.png') {
        processedBuffer = await sharpInstance
          .png({ quality: 100, compressionLevel: 9, palette: true })
          .toBuffer();
      } else if (ext === '.webp') {
        processedBuffer = await sharpInstance
          .webp({ lossless: true })
          .toBuffer();
      } else {
        processedBuffer = await sharpInstance
          .jpeg({ quality: 100, mozjpeg: true })
          .toBuffer();
      }
    } else {
      processedBuffer = imageFile.data;
    }

    const uploadResult = await s3Service.uploadImage(processedBuffer, originalName);
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      image: uploadResult
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});
