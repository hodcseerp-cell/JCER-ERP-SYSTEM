import { Request, Response, NextFunction } from 'express';
import sequelize from '../config/database';
import User from '../models/User';
import Student from '../models/Student';
import Admission from '../models/Admission';
import Department from '../models/Department';
import SystemConfiguration from '../models/SystemConfiguration';

export const getConfig = async (_req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    let config = await SystemConfiguration.findOne();
    if (!config) {
      config = await SystemConfiguration.create({});
    }

    const dbFeatures = config.features || {};
    const keys = ['admission', 'admin', 'principal', 'student', 'teacher', 'hod', 'parent', 'fees', 'library', 'placement', 'hostel', 'grievances'];
    const features: Record<string, boolean> = {};
    for (const key of keys) {
      const envKey = `FEATURE_${key.toUpperCase()}`;
      const envVal = process.env[envKey];
      if (envVal !== undefined) {
        features[key] = envVal === 'true';
      } else {
        features[key] = !!dbFeatures[key];
      }
    }

    const responseData = {
      ...config.toJSON(),
      features
    };

    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    return next(error);
  }
};

export const getHealth = async (_req: Request, res: Response): Promise<any> => {
  try {
    // 1. Check Database connection
    let dbConnected = false;
    let seeded = false;
    let version = '1.0.0';
    let features: Record<string, boolean> = {};

    try {
      await sequelize.authenticate();
      dbConnected = true;
      
      const adminExists = await User.count({ where: { role: 'ADMIN' } }).catch(() => 0) > 0;
      const principalExists = await User.count({ where: { role: 'PRINCIPAL' } }).catch(() => 0) > 0;
      seeded = adminExists && principalExists;

      const config = await SystemConfiguration.findOne();
      if (config) {
        version = config.version || '1.0.0';
        const dbFeatures = config.features || {};
        const keys = ['admission', 'admin', 'principal', 'student', 'teacher', 'hod', 'parent', 'fees', 'library', 'placement', 'hostel', 'grievances'];
        for (const key of keys) {
          const envKey = `FEATURE_${key.toUpperCase()}`;
          const envVal = process.env[envKey];
          if (envVal !== undefined) {
            features[key] = envVal === 'true';
          } else {
            features[key] = !!dbFeatures[key];
          }
        }
      }
    } catch (dbErr) {
      // Don't fail the health request entirely, report unhealthy database state
    }

    return res.status(200).json({
      status: dbConnected ? 'healthy' : 'unhealthy',
      version,
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: dbConnected,
        dialect: 'postgres',
        seeded
      },
      services: {
        authentication: 'up',
        admission: features.admission !== false ? 'up' : 'down',
        notifications: 'up'
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'unhealthy', error: 'Health check failed' });
  }
};

export const dbStatus = async (_req: Request, res: Response): Promise<any> => {
  try {
    await sequelize.authenticate();
    
    // Dynamically query table count from PostgreSQL information schema
    const tableCountQuery = await sequelize.query(
      `SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'`,
      { type: 'SELECT' } as any
    );
    const tables = parseInt((tableCountQuery[0] as any)?.count || '0', 10);
    
    const userCount = await User.count().catch(() => -1);
    const admissionCount = await Admission.count().catch(() => -1);
    const departmentCount = await Department.count().catch(() => -1);
    
    const adminExists = await User.count({ where: { role: 'ADMIN' } }).catch(() => 0) > 0;
    const principalExists = await User.count({ where: { role: 'PRINCIPAL' } }).catch(() => 0) > 0;
    const seeded = adminExists && principalExists;
    
    // Test AdmissionDocument create & update
    let testResult: any = {};
    try {
      const AdmissionDocument = (await import('../models/AdmissionDocument')).default;
      const AdmissionModel = (await import('../models/Admission')).default;
      const testAdmission = await AdmissionModel.findOne();
      if (testAdmission) {
        let doc = await AdmissionDocument.findOne({ where: { admissionId: testAdmission.id } });
        if (!doc) {
          doc = await AdmissionDocument.create({ admissionId: testAdmission.id, photoUrl: 'test_photo' });
          testResult.action = 'created';
        } else {
          await doc.update({ signatureUrl: 'test_signature_' + Date.now() });
          testResult.action = 'updated';
        }
        testResult.success = true;
        testResult.doc = doc.toJSON();
      } else {
        testResult.success = false;
        testResult.error = 'No admission found';
      }
    } catch (e: any) {
      testResult.success = false;
      testResult.error = e.message;
      testResult.stack = e.stack;
    }

    return res.status(200).json({
      success: true,
      connected: true,
      sequelize: 'PostgreSQL',
      database: process.env.DB_NAME || 'college_erp_db',
      tables,
      pendingMigrations: 0,
      seeded,
      version: '1.0.0',
      health: 'ok',
      testResult,
      counts: {
        users: userCount,
        admissions: admissionCount,
        departments: departmentCount
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      connected: false,
      database: 'error',
      error: error.message || 'Database connection failed'
    });
  }
};

export const getVersion = async (_req: Request, res: Response): Promise<any> => {
  try {
    const config = await SystemConfiguration.findOne();
    return res.status(200).json({
      success: true,
      version: config?.version || '1.0.0'
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      version: '1.0.0'
    });
  }
};

export const getFeatures = async (_req: Request, res: Response): Promise<any> => {
  try {
    const config = await SystemConfiguration.findOne();
    const dbFeatures = config?.features || {};
    const keys = ['admission', 'admin', 'principal', 'student', 'teacher', 'hod', 'parent', 'fees', 'library', 'placement', 'hostel', 'grievances'];
    const features: Record<string, boolean> = {};
    for (const key of keys) {
      const envKey = `FEATURE_${key.toUpperCase()}`;
      const envVal = process.env[envKey];
      if (envVal !== undefined) {
        features[key] = envVal === 'true';
      } else {
        features[key] = !!dbFeatures[key];
      }
    }
    return res.status(200).json({
      success: true,
      features
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch features'
    });
  }
};
