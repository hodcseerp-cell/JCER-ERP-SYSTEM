import { DataTypes, Model } from 'sequelize';
import db from '../config/database';

class SystemConfiguration extends Model {
  public id!: string;
  public collegeName!: string;
  public admissionOpen!: boolean;
  public admissionCycle!: string;
  public maintenanceMode!: boolean;
  public supportEmail!: string;
  public supportPhone!: string;
  public admissionClosingDate!: Date | null;
  public handbookUrl!: string | null;
  public version!: string;
  public features!: any; // JSON object for feature flags
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SystemConfiguration.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    collegeName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Jain College of Engineering & Research',
    },
    admissionOpen: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    admissionCycle: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    },
    admissionClosingDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: new Date('2026-08-31T23:59:59.000Z'),
    },
    handbookUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    maintenanceMode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    supportEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'admissions@jcer.org',
    },
    supportPhone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '+91 831 2400400',
    },
    version: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '1.0.0',
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        admission: process.env.FEATURE_ADMISSION !== 'false',
        admin: process.env.FEATURE_ADMIN !== 'false',
        principal: process.env.FEATURE_PRINCIPAL !== 'false',
        student: process.env.FEATURE_STUDENT === 'true',
        teacher: process.env.FEATURE_TEACHER === 'true',
        hod: process.env.FEATURE_HOD === 'true',
        parent: process.env.FEATURE_PARENT === 'true',
        fees: process.env.FEATURE_FEES === 'true',
        library: process.env.FEATURE_LIBRARY === 'true',
        placement: process.env.FEATURE_PLACEMENT === 'true',
        hostel: process.env.FEATURE_HOSTEL === 'true',
        grievances: process.env.FEATURE_GRIEVANCES === 'true',
      },
    },
  },
  {
    sequelize: db,
    tableName: 'system_configurations',
    timestamps: true,
  }
);

export default SystemConfiguration;
