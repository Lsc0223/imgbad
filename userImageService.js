const db = require('./database');

class UserImageService {
  recordImage(userId, s3Key, fileName, fileSize) {
    const stmt = db.prepare(`
      INSERT INTO user_images (user_id, s3_key, file_name, file_size)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(userId, s3Key, fileName, fileSize);
  }

  getUserImages(userId) {
    const stmt = db.prepare(`
      SELECT id, s3_key, file_name, file_size, created_at
      FROM user_images
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(userId);
  }

  deleteImage(userId, imageId) {
    const stmt = db.prepare(`
      DELETE FROM user_images
      WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(imageId, userId);
    return result.changes > 0;
  }

  getImageById(userId, imageId) {
    const stmt = db.prepare(`
      SELECT id, s3_key, file_name, file_size, created_at
      FROM user_images
      WHERE id = ? AND user_id = ?
    `);
    return stmt.get(imageId, userId);
  }

  getTotalImageSize(userId) {
    const stmt = db.prepare(`
      SELECT SUM(file_size) as total FROM user_images WHERE user_id = ?
    `);
    const result = stmt.get(userId);
    return result.total || 0;
  }

  getTotalImageCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM user_images WHERE user_id = ?
    `);
    const result = stmt.get(userId);
    return result.count || 0;
  }
}

module.exports = new UserImageService();
