const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    const val = parts.slice(1).join('=');
    cookies[name] = decodeURIComponent(val);
  });
  return cookies;
}

class AuthController {
  async login(req, res) {
    try {
      const { email, password, organizationId } = req.body;

      if (!email || !password || !organizationId) {
        return res.status(400).json({ error: 'Email, password, and organization ID are required' });
      }

      const user = await userRepository.findByEmail(email, organizationId);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate Access Token (15 minutes)
      const token = jwt.sign(
        { userId: user.id, organizationId: user.organization_id, role: user.role },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Generate Refresh Token (7 days)
      const rawRefreshToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await refreshTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // Set Cookie with Refresh Token
      res.cookie('refreshToken', rawRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organization_id,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async refresh(req, res) {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const rawRefreshToken = cookies.refreshToken;

      if (!rawRefreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      const tokenRow = await refreshTokenRepository.findByHash(tokenHash);

      if (!tokenRow) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Check for token reuse (revocation status)
      if (tokenRow.revoked_at !== null) {
        // Potential reuse attack! Invalidate all refresh tokens for this user
        await refreshTokenRepository.revokeAllForUser(tokenRow.user_id);
        
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        });
        return res.status(401).json({ error: 'Session compromised. Please log in again.' });
      }

      // Check expiration
      if (new Date(tokenRow.expires_at) < new Date()) {
        return res.status(401).json({ error: 'Session expired' });
      }

      // Revoke the old refresh token (invalidation for rotation)
      await refreshTokenRepository.revoke(tokenHash);

      const user = await userRepository.findById(tokenRow.user_id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Generate New Access Token (15 minutes)
      const newAccessToken = jwt.sign(
        { userId: user.id, organizationId: user.organization_id, role: user.role },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Generate New Refresh Token (7 days)
      const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
      const newHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await refreshTokenRepository.create({
        userId: user.id,
        tokenHash: newHash,
        expiresAt,
      });

      res.cookie('refreshToken', newRawRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        token: newAccessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organization_id,
        },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async logout(req, res) {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const rawRefreshToken = cookies.refreshToken;

      if (rawRefreshToken) {
        const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
        await refreshTokenRepository.revoke(tokenHash);
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });

      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async register(req, res) {
    try {
      const { name, email, password, role, organizationId } = req.body;

      if (!name || !email || !password || !organizationId) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(email, organizationId);
      if (existingUser) {
        return res.status(400).json({ error: 'User already registered under this organization' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await userRepository.create({
        organizationId,
        name,
        email,
        passwordHash,
        role,
      });

      return res.status(201).json(newUser);
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listOrganizations(req, res) {
    try {
      const db = require('../config/db');
      const result = await db.query('SELECT id, name FROM organizations ORDER BY name ASC');
      return res.json(result.rows);
    } catch (error) {
      console.error('List organizations error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AuthController();
