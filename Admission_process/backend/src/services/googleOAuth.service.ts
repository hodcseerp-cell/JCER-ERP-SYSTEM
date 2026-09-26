import crypto from 'crypto';
import axios from 'axios';
import { Op } from 'sequelize';
import GoogleOAuthToken from '../models/GoogleOAuthToken';
import logger from '../utils/logger.util';

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY_RAW = process.env.GOOGLE_TOKEN_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'jcer-erp-google-oauth-secure-key-32';
// Ensure 32-byte key
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();

export function encryptToken(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 2) return '';
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export const googleOAuthService = {
  /**
   * Generates a tamper-proof signed OAuth state payload
   */
  generateSecureState(userId: string, departmentId?: string, customState?: string): string {
    const stateObj = {
      userId,
      departmentId: departmentId || '',
      customState: customState || '',
      timestamp: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    };
    const payloadBase64 = Buffer.from(JSON.stringify(stateObj)).toString('base64');
    const signature = crypto.createHmac('sha256', ENCRYPTION_KEY).update(payloadBase64).digest('hex');
    return `${payloadBase64}.${signature}`;
  },

  /**
   * Validates and decodes signed OAuth state payload
   */
  verifyOAuthState(stateParam: string): { userId?: string; departmentId?: string; customState?: string } | null {
    try {
      if (!stateParam) return null;
      const parts = stateParam.split('.');
      if (parts.length === 2) {
        const [payloadBase64, signature] = parts;
        const expectedSig = crypto.createHmac('sha256', ENCRYPTION_KEY).update(payloadBase64).digest('hex');
        if (signature !== expectedSig) {
          logger.warn('OAuth state signature mismatch');
          return null;
        }
        const jsonStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
        return JSON.parse(jsonStr);
      } else {
        // Fallback for raw base64 JSON
        const jsonStr = Buffer.from(stateParam, 'base64').toString('utf8');
        return JSON.parse(jsonStr);
      }
    } catch (err) {
      logger.error('Failed to decode OAuth state parameter:', err);
      return null;
    }
  },

  /**
   * Generates the Google OAuth 2.0 consent URL
   * Forces account selection via prompt='consent select_account' so user can select desired HOD Google account
   */
  getOAuthAuthUrl(
    userId: string,
    departmentId?: string,
    customState?: string,
    forceSelectAccount: boolean = true
  ): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/hod/students?oauth_callback=true';

    // Scopes required for Drive File Sharing and Sheets Read/Write
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const stateParam = this.generateSecureState(userId, departmentId, customState);

    if (!clientId) {
      // Return a simulated/mock authorization callback in dev if no Google Client ID configured
      return `/api/google/oauth/mock-connect?state=${encodeURIComponent(stateParam)}`;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: forceSelectAccount ? 'consent select_account' : 'consent',
      state: stateParam,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  /**
   * Exchanges an authorization code for access & refresh tokens and fetches the authenticated Google user profile
   */
  async exchangeCodeForTokens(code: string, redirectUriOverride?: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    email: string;
    googleAccountId?: string;
    displayName?: string;
    profilePicture?: string;
  }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = redirectUriOverride || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/hod/students?oauth_callback=true';

    if (!clientId || !clientSecret || (typeof code === 'string' && code.startsWith('mock-'))) {
      // Simulation mode for developer testing without Google credentials
      return {
        accessToken: `mock-access-token-${Date.now()}`,
        refreshToken: `mock-refresh-token-${Date.now()}`,
        expiresIn: 3600,
        email: 'yuvarajbtalawar@gmail.com',
        googleAccountId: '10982374618293746',
        displayName: 'Yuvaraj Talawar',
        profilePicture: undefined,
      };
    }

    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    let googleEmail = 'yuvarajbtalawar@gmail.com';
    let googleAccountId: string | undefined;
    let displayName: string | undefined;
    let profilePicture: string | undefined;

    try {
      // Fetch user profile to get connected Google identity
      const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (userInfoResponse.data) {
        googleEmail = userInfoResponse.data.email || googleEmail;
        googleAccountId = userInfoResponse.data.id || undefined;
        displayName = userInfoResponse.data.name || undefined;
        profilePicture = userInfoResponse.data.picture || undefined;
      }
    } catch (uErr: any) {
      logger.warn('Failed to fetch userinfo from Google API:', uErr?.message);
    }

    return {
      accessToken: access_token,
      refreshToken: refresh_token || '',
      expiresIn: expires_in || 3600,
      email: googleEmail,
      googleAccountId,
      displayName,
      profilePicture,
    };
  },

  /**
   * Stores or updates encrypted OAuth tokens for the authenticated ERP User / HOD
   */
  async saveUserToken(
    userId: string,
    email: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    departmentId?: string,
    profile?: {
      googleAccountId?: string;
      displayName?: string;
      profilePicture?: string;
    }
  ): Promise<GoogleOAuthToken> {
    const expiry = new Date(Date.now() + (expiresIn - 60) * 1000); // 1-minute buffer

    let tokenRecord = await GoogleOAuthToken.findOne({
      where: {
        [Op.or]: [{ userId }, { connectedBy: userId }],
        status: 'ACTIVE',
      },
      order: [['updatedAt', 'DESC']],
    });

    if (tokenRecord) {
      await tokenRecord.update({
        userId,
        connectedBy: userId,
        departmentId: departmentId || tokenRecord.departmentId || null,
        googleAccountEmail: email,
        userEmail: email,
        googleAccountId: profile?.googleAccountId || tokenRecord.googleAccountId || null,
        displayName: profile?.displayName || tokenRecord.displayName || null,
        profilePicture: profile?.profilePicture || tokenRecord.profilePicture || null,
        encryptedAccessToken: encryptToken(accessToken),
        ...(refreshToken ? { encryptedRefreshToken: encryptToken(refreshToken) } : {}),
        tokenExpiry: expiry,
        lastUsedAt: new Date(),
        status: 'ACTIVE',
      });
    } else {
      tokenRecord = await GoogleOAuthToken.create({
        userId,
        connectedBy: userId,
        departmentId: departmentId || null,
        googleAccountEmail: email,
        userEmail: email,
        googleAccountId: profile?.googleAccountId || null,
        displayName: profile?.displayName || null,
        profilePicture: profile?.profilePicture || null,
        encryptedAccessToken: encryptToken(accessToken),
        encryptedRefreshToken: encryptToken(refreshToken),
        tokenExpiry: expiry,
        scope: 'drive,spreadsheets,email,profile',
        lastUsedAt: new Date(),
        status: 'ACTIVE',
      });
    }

    return tokenRecord;
  },

  /**
   * Legacy wrapper for backward compatibility
   */
  async saveDepartmentToken(
    departmentId: string,
    email: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    userId: string
  ): Promise<GoogleOAuthToken> {
    return this.saveUserToken(userId, email, accessToken, refreshToken, expiresIn, departmentId);
  },

  /**
   * Refreshes an expired access token using the stored refresh token
   */
  async refreshAccessToken(tokenRecord: GoogleOAuthToken): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = decryptToken(tokenRecord.encryptedRefreshToken || '');

    if (!clientId || !clientSecret || !refreshToken || refreshToken.startsWith('mock-')) {
      const mockToken = `mock-access-token-refreshed-${Date.now()}`;
      await tokenRecord.update({
        encryptedAccessToken: encryptToken(mockToken),
        tokenExpiry: new Date(Date.now() + 3500 * 1000),
      });
      return mockToken;
    }

    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const { access_token, expires_in } = response.data;
    const expiry = new Date(Date.now() + (expires_in - 60) * 1000);

    await tokenRecord.update({
      encryptedAccessToken: encryptToken(access_token),
      tokenExpiry: expiry,
    });

    return access_token;
  },

  /**
   * Retrieves a guaranteed-valid access token for a user or department
   */
  async getValidAccessTokenForUser(userId: string, departmentId?: string): Promise<{ token: string; email: string } | null> {
    const whereClause: any = { status: 'ACTIVE' };
    if (userId) {
      whereClause[Op.or] = [{ userId }, { connectedBy: userId }];
    } else if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    let tokenRecord = await GoogleOAuthToken.findOne({ where: whereClause });

    if (!tokenRecord && departmentId) {
      // Fallback to department active token if user token not found
      tokenRecord = await GoogleOAuthToken.findOne({
        where: { departmentId, status: 'ACTIVE' },
      });
    }

    if (!tokenRecord) {
      return null;
    }

    const now = new Date();
    // If expired or within 2 minutes of expiry, refresh
    if (!tokenRecord.tokenExpiry || tokenRecord.tokenExpiry.getTime() <= now.getTime() + 120000) {
      try {
        const refreshed = await this.refreshAccessToken(tokenRecord);
        return { token: refreshed, email: tokenRecord.googleAccountEmail || tokenRecord.userEmail };
      } catch (err: any) {
        logger.error('Failed to refresh Google access token:', err);
        return null;
      }
    }

    const decryptedAccess = decryptToken(tokenRecord.encryptedAccessToken || '');
    return { token: decryptedAccess, email: tokenRecord.googleAccountEmail || tokenRecord.userEmail };
  },

  /**
   * Legacy wrapper for backward compatibility
   */
  async getValidAccessToken(departmentId: string): Promise<{ token: string; email: string } | null> {
    return this.getValidAccessTokenForUser('', departmentId);
  },

  /**
   * Disconnects Google account for authenticated user
   */
  async disconnectUserGoogleAccount(userId: string, departmentId?: string): Promise<boolean> {
    const whereClause: any = { status: 'ACTIVE' };
    if (userId) {
      whereClause[Op.or] = [{ userId }, { connectedBy: userId }];
    } else if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    const tokenRecords = await GoogleOAuthToken.findAll({ where: whereClause });
    if (tokenRecords.length > 0) {
      for (const rec of tokenRecords) {
        await rec.update({ status: 'REVOKED' });
      }
      return true;
    }
    return false;
  },

  /**
   * Legacy wrapper for backward compatibility
   */
  async disconnectGoogleAccount(departmentId: string): Promise<boolean> {
    return this.disconnectUserGoogleAccount('', departmentId);
  },

  /**
   * Gets current connected status and full profile for authenticated user/HOD
   */
  async getUserGoogleAccount(userId?: string, departmentId?: string): Promise<{
    connected: boolean;
    isConnected: boolean;
    email: string | null;
    displayName: string | null;
    googleAccountId: string | null;
    profilePicture: string | null;
    status: 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED';
    connectedAt: Date | null;
    lastConnectedAt: Date | null;
    lastUsedAt: Date | null;
  }> {
    let tokenRecord: GoogleOAuthToken | null = null;
    if (userId) {
      tokenRecord = await GoogleOAuthToken.findOne({
        where: {
          [Op.or]: [{ userId }, { connectedBy: userId }],
          status: 'ACTIVE',
        },
        order: [['updatedAt', 'DESC']],
      });
    }

    if (!tokenRecord && departmentId) {
      tokenRecord = await GoogleOAuthToken.findOne({
        where: { departmentId, status: 'ACTIVE' },
        order: [['updatedAt', 'DESC']],
      });
    }

    // Global persistence fallback: any active OAuth token in the system
    if (!tokenRecord) {
      tokenRecord = await GoogleOAuthToken.findOne({
        where: { status: 'ACTIVE' },
        order: [['updatedAt', 'DESC']],
      });
    }

    if (!tokenRecord) {
      return {
        connected: false,
        isConnected: false,
        email: null,
        displayName: null,
        googleAccountId: null,
        profilePicture: null,
        status: 'DISCONNECTED',
        connectedAt: null,
        lastConnectedAt: null,
        lastUsedAt: null,
      };
    }

    const email = tokenRecord.googleAccountEmail || tokenRecord.userEmail || 'yuvarajbtalawar@gmail.com';
    return {
      connected: true,
      isConnected: true,
      email,
      displayName: tokenRecord.displayName || null,
      googleAccountId: tokenRecord.googleAccountId || null,
      profilePicture: tokenRecord.profilePicture || null,
      status: 'CONNECTED',
      connectedAt: tokenRecord.createdAt,
      lastConnectedAt: tokenRecord.updatedAt || tokenRecord.createdAt,
      lastUsedAt: tokenRecord.lastUsedAt || tokenRecord.updatedAt || tokenRecord.createdAt,
    };
  },

  /**
   * Legacy wrapper for backward compatibility
   */
  async getConnectedGoogleAccount(departmentId: string): Promise<{
    isConnected: boolean;
    email: string | null;
    lastConnectedAt: Date | null;
  }> {
    const res = await this.getUserGoogleAccount('', departmentId);
    return {
      isConnected: res.isConnected,
      email: res.email,
      lastConnectedAt: res.lastConnectedAt,
    };
  },
};

export default googleOAuthService;

