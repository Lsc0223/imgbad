const express = require('express');
const fileUpload = require('express-fileupload');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const s3Service = require('./s3Service');
const authService = require('./authService');
const userImageService = require('./userImageService');

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

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = authService.validateSession(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const userId = authService.createUser(username, email, password);
    const token = authService.createSession(userId);

    res.json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        username
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    const user = authService.authenticateUser(username, password);
    const token = authService.createSession(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    authService.deleteSession(token);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/profile', authMiddleware, (req, res) => {
  try {
    const user = authService.getUserById(req.user.userId);
    const imageCount = userImageService.getTotalImageCount(req.user.userId);
    const totalSize = userImageService.getTotalImageSize(req.user.userId);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      },
      stats: {
        imageCount,
        totalSize
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/api/images', authMiddleware, async (req, res) => {
  try {
    if (!s3Service.isConfigured()) {
      return res.status(400).json({ error: 'S3 not configured' });
    }

    const userImages = userImageService.getUserImages(req.user.userId);
    const images = userImages.map(img => ({
      id: img.id,
      key: img.s3_key,
      name: img.file_name,
      size: img.file_size,
      lastModified: img.created_at,
      url: s3Service.getPublicUrl(img.s3_key)
    }));

    res.json({ images });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', authMiddleware, async (req, res) => {
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
    
    userImageService.recordImage(
      req.user.userId,
      uploadResult.key,
      uploadResult.name,
      processedBuffer.length
    );

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

app.delete('/api/images/:id', authMiddleware, async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = userImageService.getImageById(req.user.userId, imageId);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await s3Service.deleteImage(image.s3_key);
    userImageService.deleteImage(req.user.userId, imageId);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
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
