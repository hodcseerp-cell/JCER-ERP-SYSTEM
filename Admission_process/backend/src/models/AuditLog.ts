import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import User from './User';

class AuditLog extends Model {
  public id!: string;
  public userId!: string | null;
  public action!: string;
  public ipAddress!: string | null;
  public userAgent!: string | null;
  public details!: any; // JSON
  public readonly createdAt!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    action: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['action'],
      },
      {
        fields: ['createdAt'],
      },
    ],
  }
);

// Associations
AuditLog.belongsTo(User, { as: 'user', foreignKey: 'userId' });

export default AuditLog;
