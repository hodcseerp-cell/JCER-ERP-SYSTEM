import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import User from './User';

export type ExportJobStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

class BulkExportJob extends Model {
  public id!: string;
  public createdBy!: string;
  public academicYear!: string;
  public branchId!: string;
  public status!: ExportJobStatus;
  public totalStudents!: number;
  public totalDocuments!: number;
  public processedDocuments!: number;
  public failedDocuments!: number;
  public progress!: number;
  public zipObjectKey?: string | null;
  public zipSize?: number | null;
  public error?: string | null;
  public failureSummary?: any | null;
  public startedAt?: Date | null;
  public completedAt?: Date | null;
  public expiresAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BulkExportJob.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    academicYear: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    branchId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'ALL',
    },
    status: {
      type: DataTypes.ENUM(
        'QUEUED',
        'PROCESSING',
        'COMPLETED',
        'COMPLETED_WITH_ERRORS',
        'FAILED',
        'CANCELLED',
        'EXPIRED'
      ),
      allowNull: false,
      defaultValue: 'QUEUED',
    },
    totalStudents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalDocuments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    processedDocuments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failedDocuments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    zipObjectKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    zipSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    failureSummary: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'bulk_export_jobs',
    timestamps: true,
  }
);

BulkExportJob.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

export default BulkExportJob;
