import { google } from 'googleapis';
import { Readable } from 'stream';
import GoogleDriveIntegration from '../models/GoogleDriveIntegration';
import AttendanceBackupFile from '../models/AttendanceBackupFile';
import AttendanceBackupJob from '../models/AttendanceBackupJob';
import User from '../models/User';
import { encryptText, decryptText } from '../utils/crypto.util';
import logger from '../utils/logger.util';

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const ROOT_FOLDER_NAME = 'JCER ERP Attendance';

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/oauth/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are missing from backend environment.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export const googleDriveService = {
  /**
   * Generates Google OAuth consent URL with CSRF state
   */
  generateAuthUrl(stateData?: string): string {
    const oauth2Client = getOAuth2Client();
    const state = stateData || `state_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Ensures refresh token is always returned
      scope: DRIVE_SCOPES,
      state,
    });
  },

  /**
   * Exchanges OAuth authorization code for tokens, saves encrypted refresh token, and initializes root folder
   */
  async handleOAuthCallback(code: string, userId?: string): Promise<{ accountEmail: string; rootFolderId: string }> {
    const oauth2Client = getOAuth2Client();

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.refresh_token) {
      // Check if existing refresh token is already stored
      const existing = await GoogleDriveIntegration.findOne({
        where: { status: 'CONNECTED' },
        order: [['updatedAt', 'DESC']],
      });
      if (!existing || !existing.encryptedRefreshToken) {
        throw new Error('No refresh token received from Google. Please reconnect with consent prompt.');
      }
    }

    // Retrieve user profile from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const accountEmail = userInfo.data.email || 'jcer.attendance.backup@gmail.com';
    const accountName = userInfo.data.name || 'JCER Google Account';

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Find or create Root Folder "JCER ERP Attendance"
    const rootFolderId = await this.ensureRootFolder(drive);

    // Save or update GoogleDriveIntegration record
    let integration = await GoogleDriveIntegration.findOne({
      order: [['createdAt', 'ASC']],
    });

    const encryptedToken = tokens.refresh_token ? encryptText(tokens.refresh_token) : integration?.encryptedRefreshToken || '';

    if (integration) {
      integration.accountEmail = accountEmail;
      integration.accountName = accountName;
      if (tokens.refresh_token) {
        integration.encryptedRefreshToken = encryptedToken;
      }
      integration.accessToken = tokens.access_token || null;
      integration.tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
      integration.rootFolderId = rootFolderId;
      integration.rootFolderName = ROOT_FOLDER_NAME;
      integration.status = 'CONNECTED';
      integration.connectedById = userId || integration.connectedById;
      integration.lastSyncAt = new Date();
      integration.lastError = null;
      await integration.save();
    } else {
      integration = await GoogleDriveIntegration.create({
        accountEmail,
        accountName,
        encryptedRefreshToken: encryptedToken,
        accessToken: tokens.access_token || null,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: DRIVE_SCOPES.join(' '),
        rootFolderId,
        rootFolderName: ROOT_FOLDER_NAME,
        status: 'CONNECTED',
        autoBackupEnabled: true,
        connectedById: userId || null,
        lastSyncAt: new Date(),
      });
    }

    logger.info(`Google Drive successfully connected for account ${accountEmail} by user ${userId}. Root folder ID: ${rootFolderId}`);
    return { accountEmail, rootFolderId };
  },

  /**
   * Retrieves authorized Google Drive client with automatic token refreshing
   */
  async getAuthorizedDriveClient() {
    const integration = await GoogleDriveIntegration.findOne({
      where: { status: 'CONNECTED' },
    });

    if (!integration || !integration.encryptedRefreshToken) {
      throw new Error('Google Drive is not connected. Please connect from Dean Settings.');
    }

    const refreshToken = decryptText(integration.encryptedRefreshToken);
    const oauth2Client = getOAuth2Client();

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Setup listener for auto-refreshed access tokens
    oauth2Client.on('tokens', async (tokens) => {
      try {
        if (tokens.access_token) {
          integration.accessToken = tokens.access_token;
          if (tokens.expiry_date) {
            integration.tokenExpiry = new Date(tokens.expiry_date);
          }
          await integration.save();
        }
      } catch (err: any) {
        logger.warn('Failed to update refreshed access token in DB:', err.message);
      }
    });

    return {
      drive: google.drive({ version: 'v3', auth: oauth2Client }),
      integration,
    };
  },

  /**
   * Ensures the root folder "JCER ERP Attendance" exists and is not trashed
   */
  async ensureRootFolder(drive: any): Promise<string> {
    const query = `name = '${ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name, parents)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    // Create root folder under My Drive
    const createRes = await drive.files.create({
      requestBody: {
        name: ROOT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id, name',
    });

    return createRes.data.id;
  },

  /**
   * Ensures the root folder "JCER ERP Bitwise Marks" exists and is not trashed
   */
  async ensureMarksRootFolder(drive: any, folderName = 'JCER ERP Bitwise Marks'): Promise<string> {
    const safeName = folderName.replace(/'/g, "\\'");
    const query = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name, parents)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    // Create root folder under My Drive
    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id, name',
    });

    return createRes.data.id;
  },

  /**
   * Finds or creates a subfolder strictly scoped under a parent folder ID
   */
  async findOrCreateSubfolder(drive: any, parentId: string, folderName: string): Promise<string> {
    if (!parentId) {
      throw new Error(`Cannot create or find subfolder "${folderName}" without a valid parent folder ID.`);
    }

    // Sanitize folder name quotes
    const safeName = folderName.replace(/'/g, "\\'");
    const query = `'${parentId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name, parents)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id, name, parents',
    });

    return createRes.data.id;
  },

  /**
   * Idempotently builds or locates full hierarchy with strict parent-child chaining:
   * JCER ERP Attendance -> [AcademicYear] -> [DeptCode] -> Semester [N] -> Section [X]
   */
  async ensureFolderHierarchy(
    academicYear: string,
    departmentCode: string,
    semester: number,
    section: string
  ): Promise<string> {
    const { drive, integration } = await this.getAuthorizedDriveClient();

    let rootId = integration.rootFolderId;
    if (!rootId) {
      rootId = await this.ensureRootFolder(drive);
      integration.rootFolderId = rootId;
      await integration.save();
    }

    // 1. Academic Year Folder (Normalize "2026-2027" or "2026-27" -> "2026-27")
    let cleanAY = academicYear.trim().replace(/\u2013|\u2014/g, '-');
    const ayMatch = cleanAY.match(/^(\d{4})-\d{2}(\d{2})$/);
    if (ayMatch) {
      cleanAY = `${ayMatch[1]}-${ayMatch[2]}`;
    }
    const ayFolderId = await this.findOrCreateSubfolder(drive, rootId, cleanAY);

    // 2. Department Folder (e.g. "CSE", "ECE", "ME")
    const cleanDept = (departmentCode || 'CSE').trim().toUpperCase();
    const deptFolderId = await this.findOrCreateSubfolder(drive, ayFolderId, cleanDept);

    // 3. Semester Folder (e.g. "Semester 3")
    const semFolderName = `Semester ${semester}`;
    const semFolderId = await this.findOrCreateSubfolder(drive, deptFolderId, semFolderName);

    // 4. Section Folder (e.g. "Section A", "Section B")
    const cleanSec = section.replace(/^Section\s+/i, '').trim() || 'A';
    const secFolderName = `Section ${cleanSec}`;
    const secFolderId = await this.findOrCreateSubfolder(drive, semFolderId, secFolderName);

    return secFolderId;
  },

  /**
   * Idempotently builds or locates Semester folder directly under Department:
   * JCER ERP Attendance -> [AcademicYear] -> [DeptCode] -> Semester [N]
   */
  async ensureSemesterFolderHierarchy(
    academicYear: string,
    departmentCode: string,
    semester: number
  ): Promise<string> {
    const { drive, integration } = await this.getAuthorizedDriveClient();

    let rootId = integration.rootFolderId;
    if (!rootId) {
      rootId = await this.ensureRootFolder(drive);
      integration.rootFolderId = rootId;
      await integration.save();
    }

    // 1. Academic Year Folder
    let cleanAY = academicYear.trim().replace(/\u2013|\u2014/g, '-');
    const ayMatch = cleanAY.match(/^(\d{4})-\d{2}(\d{2})$/);
    if (ayMatch) {
      cleanAY = `${ayMatch[1]}-${ayMatch[2]}`;
    }
    const ayFolderId = await this.findOrCreateSubfolder(drive, rootId, cleanAY);

    // 2. Department Folder (e.g. "CSE", "CSE-AIML", "ECE")
    const cleanDept = (departmentCode || 'CSE').trim().toUpperCase();
    const deptFolderId = await this.findOrCreateSubfolder(drive, ayFolderId, cleanDept);

    // 3. Semester Folder (e.g. "Semester 1", "Semester 3")
    const semFolderName = `Semester ${semester}`;
    const semFolderId = await this.findOrCreateSubfolder(drive, deptFolderId, semFolderName);

    return semFolderId;
  },

  /**
   * Uploads new or updates existing Consolidated Semester Excel workbook directly inside the Semester folder
   */
  async uploadOrUpdateConsolidatedWorkbook(
    semesterFolderId: string,
    fileName: string,
    fileBuffer: Buffer,
    existingDriveFileId?: string | null
  ): Promise<string> {
    const { drive } = await this.getAuthorizedDriveClient();

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: Readable.from(fileBuffer),
    };

    // 1. If explicit existing Drive file ID provided, attempt update and verify parent
    if (existingDriveFileId) {
      try {
        const fileMeta = await drive.files.get({
          fileId: existingDriveFileId,
          fields: 'id, name, parents, trashed',
        });

        if (fileMeta.data && !fileMeta.data.trashed) {
          const currentParents = fileMeta.data.parents || [];
          const updateParams: any = {
            fileId: existingDriveFileId,
            requestBody: {
              name: fileName,
            },
            media,
            fields: 'id, name, parents, modifiedTime',
          };

          // Re-parent file into target Semester folder if not already there
          if (!currentParents.includes(semesterFolderId)) {
            updateParams.addParents = semesterFolderId;
            if (currentParents.length > 0) {
              updateParams.removeParents = currentParents.join(',');
            }
          }

          const updateRes = await drive.files.update(updateParams);
          return updateRes.data.id!;
        }
      } catch (err: any) {
        logger.warn(`Google Drive update failed for consolidated fileId ${existingDriveFileId}. Will check folder:`, err.message);
      }
    }

    // 2. Check if a file with same name already exists in target Semester folder
    const safeName = fileName.replace(/'/g, "\\'");
    const query = `'${semesterFolderId}' in parents and name = '${safeName}' and trashed = false`;
    const searchRes = await drive.files.list({
      q: query,
      fields: 'files(id, name, parents)',
      spaces: 'drive',
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      const foundId = searchRes.data.files[0].id!;
      const updateRes = await drive.files.update({
        fileId: foundId,
        media,
        fields: 'id, name, parents, modifiedTime',
      });
      return updateRes.data.id!;
    }

    // 3. Create new workbook file directly under Semester folder
    const createRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [semesterFolderId],
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      media,
      fields: 'id, name, parents, modifiedTime',
    });

    return createRes.data.id!;
  },

  /**
   * Uploads new or updates existing Excel workbook strictly within the target Section folder
   */
  async uploadOrUpdateAttendanceWorkbook(
    folderId: string,
    fileName: string,
    fileBuffer: Buffer,
    existingDriveFileId?: string | null
  ): Promise<string> {
    const { drive } = await this.getAuthorizedDriveClient();

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: Readable.from(fileBuffer),
    };

    // 1. If explicit existing Drive file ID provided, attempt update and verify parent
    if (existingDriveFileId) {
      try {
        const fileMeta = await drive.files.get({
          fileId: existingDriveFileId,
          fields: 'id, name, parents, trashed',
        });

        if (fileMeta.data && !fileMeta.data.trashed) {
          const currentParents = fileMeta.data.parents || [];
          const updateParams: any = {
            fileId: existingDriveFileId,
            requestBody: {
              name: fileName,
            },
            media,
            fields: 'id, name, parents, modifiedTime',
          };

          // Re-parent file into target Section folder if not already there
          if (!currentParents.includes(folderId)) {
            updateParams.addParents = folderId;
            if (currentParents.length > 0) {
              updateParams.removeParents = currentParents.join(',');
            }
          }

          const updateRes = await drive.files.update(updateParams);
          return updateRes.data.id!;
        }
      } catch (err: any) {
        logger.warn(`Google Drive update failed for fileId ${existingDriveFileId}. Will check folder:`, err.message);
      }
    }

    // 2. Check if a file with same name already exists in target Section folder
    const safeName = fileName.replace(/'/g, "\\'");
    const query = `'${folderId}' in parents and name = '${safeName}' and trashed = false`;
    const searchRes = await drive.files.list({
      q: query,
      fields: 'files(id, name, parents)',
      spaces: 'drive',
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      const foundId = searchRes.data.files[0].id!;
      const updateRes = await drive.files.update({
        fileId: foundId,
        media,
        fields: 'id, name, parents, modifiedTime',
      });
      return updateRes.data.id!;
    }

    // 3. Create new workbook file strictly under Section folderId
    const createRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      media,
      fields: 'id, name, parents, modifiedTime',
    });

    return createRes.data.id!;
  },

  /**
   * Returns Google Drive connection status and sync metrics
   */
  async getIntegrationStatus() {
    const integration = await GoogleDriveIntegration.findOne({
      order: [['createdAt', 'ASC']],
      include: [{ model: User, as: 'connectedBy', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    });

    const pendingJobsCount = await AttendanceBackupJob.count({
      where: { status: 'PENDING' },
    });

    const failedJobsCount = await AttendanceBackupJob.count({
      where: { status: 'FAILED' },
    });

    const totalSyncedFilesCount = await AttendanceBackupFile.count({
      where: { status: 'SYNCED' },
    });

    const recentJobs = await AttendanceBackupJob.findAll({
      order: [['updatedAt', 'DESC']],
      limit: 10,
    });

    const hasValidToken = Boolean(
      integration &&
      integration.status === 'CONNECTED' &&
      integration.encryptedRefreshToken &&
      integration.encryptedRefreshToken.trim() !== ''
    );

    const isConnected = hasValidToken;
    let effectiveStatus: 'CONNECTED' | 'NOT_CONNECTED' | 'ERROR' = 'NOT_CONNECTED';
    if (isConnected) {
      effectiveStatus = integration?.lastError ? 'ERROR' : 'CONNECTED';
    }

    const accountEmail = isConnected ? (integration?.accountEmail || null) : null;
    const accountName = isConnected ? (integration?.accountName || null) : null;
    const rootFolderName = isConnected ? (integration?.rootFolderName || 'JCER ERP Attendance') : 'JCER ERP Attendance';
    const rootFolderId = isConnected ? (integration?.rootFolderId || null) : null;
    const autoBackupEnabled = isConnected ? Boolean(integration?.autoBackupEnabled) : false;
    const lastSyncAt = isConnected ? (integration?.lastSyncAt || null) : null;
    const lastError = isConnected ? (integration?.lastError || null) : null;

    const numSyncedFiles = Number(totalSyncedFilesCount) || 0;
    const numPending = Number(pendingJobsCount) || 0;
    const numFailed = Number(failedJobsCount) || 0;

    return {
      connected: isConnected,
      isConnected,
      status: effectiveStatus,
      accountEmail,
      googleAccountEmail: accountEmail,
      accountName,
      rootFolder: rootFolderName,
      rootFolderName,
      rootFolderId,
      autoBackupEnabled,
      lastSuccessfulSync: lastSyncAt,
      lastSyncAt,
      lastError,
      connectedBy: isConnected && integration?.connectedBy
        ? `${(integration as any).connectedBy.firstName || ''} ${(integration as any).connectedBy.lastName || ''}`.trim() || (integration as any).connectedBy.email
        : null,
      activeWorkbooks: numSyncedFiles,
      totalSyncedFiles: numSyncedFiles,
      pendingBackups: numPending,
      failedBackups: numFailed,
      pendingJobsCount: numPending,
      failedJobsCount: numFailed,
      stats: {
        activeWorkbooks: numSyncedFiles,
        totalSyncedFiles: numSyncedFiles,
        pendingBackups: numPending,
        failedBackups: numFailed,
      },
      recentJobs: recentJobs.map((j) => ({
        id: j.id,
        action: j.action,
        status: j.status,
        attemptCount: Number(j.attemptCount) || 0,
        lastAttemptAt: j.lastAttemptAt,
        errorMessage: j.errorMessage,
        completedAt: j.completedAt,
        createdAt: j.createdAt,
      })),
    };
  },

  /**
   * Tests active Google Drive connection and verifies root folder access
   */
  async testConnection(): Promise<{ success: boolean; message: string; rootFolderId?: string; accountEmail?: string }> {
    try {
      const { drive, integration } = await this.getAuthorizedDriveClient();

      const rootFolderId = await this.ensureRootFolder(drive);
      integration.rootFolderId = rootFolderId;
      integration.lastSyncAt = new Date();
      integration.lastError = null;
      integration.status = 'CONNECTED';
      await integration.save();

      return {
        success: true,
        message: `Google Drive connection verified! Connected account: ${integration.accountEmail}, Root folder: "${ROOT_FOLDER_NAME}".`,
        rootFolderId,
        accountEmail: integration.accountEmail,
      };
    } catch (err: any) {
      const integration = await GoogleDriveIntegration.findOne();
      if (integration) {
        integration.lastError = err.message || 'Connection test failed';
        await integration.save();
      }
      return {
        success: false,
        message: err.message || 'Failed to authenticate with Google Drive API.',
      };
    }
  },

  /**
   * Disconnects Google Drive without deleting historical backups
   */
  async disconnect(): Promise<void> {
    const integration = await GoogleDriveIntegration.findOne();
    if (integration) {
      integration.status = 'DISCONNECTED';
      integration.accessToken = null;
      integration.encryptedRefreshToken = '';
      integration.lastError = null;
      await integration.save();
    }
    logger.info('Google Drive disconnected by administrator.');
  },

  /**
   * Toggles automatic backup on/off
   */
  async toggleAutoBackup(enabled: boolean): Promise<boolean> {
    const integration = await GoogleDriveIntegration.findOne();
    if (integration) {
      integration.autoBackupEnabled = enabled;
      await integration.save();
      return enabled;
    }
    return false;
  },
};

export default googleDriveService;
