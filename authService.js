const db = require('./database');
const crypto = require('crypto');

class AuthService {
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  verifyPassword(password, hash) {
    return this.hashPassword(password) === hash;
  }

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  createUser(username, email, password) {
    try {
      const passwordHash = this.hashPassword(password);
      const stmt = db.prepare(`
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
      `);
      const result = stmt.run(username, email, passwordHash);
      return result.lastInsertRowid;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        if (error.message.includes('username')) {
          throw new Error('Username already exists');
        }
        if (error.message.includes('email')) {
          throw new Error('Email already exists');
        }
      }
      throw error;
    }
  }

  authenticateUser(username, password) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);

    if (!user) {
      throw new Error('Invalid username or password');
    }

    if (!this.verifyPassword(password, user.password_hash)) {
      throw new Error('Invalid username or password');
    }

    return user;
  }

  createSession(userId, expirationHours = 24) {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

    const stmt = db.prepare(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, token, expiresAt.toISOString());

    return token;
  }

  validateSession(token) {
    const stmt = db.prepare(`
      SELECT s.*, u.id as user_id, u.username 
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `);
    const session = stmt.get(token);

    if (!session) {
      return null;
    }

    return {
      userId: session.user_id,
      username: session.username
    };
  }

  deleteSession(token) {
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    stmt.run(token);
  }

  getUserById(userId) {
    const stmt = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?');
    return stmt.get(userId);
  }
}

module.exports = new AuthService();
