import { DataTypes, Model } from 'sequelize';
import db from '../config/database';

class Notification extends Model {
  public id!: string;
  public title!: string;
  public content!: string;
  public type!: 'WARNING' | 'SUCCESS' | 'INFO' | 'ANNOUNCEMENT';
  public audience!: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'SPECIFIC_USER';
  public targetUserId!: string | null;
  public status!: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  public createdByAdminId!: string | null;
  public approvedByAdminId!: string | null;
  public publishedAt!: Date | null;
  public readAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('WARNING', 'SUCCESS', 'INFO', 'ANNOUNCEMENT'),
      allowNull: false,
      defaultValue: 'INFO',
    },
    audience: {
      type: DataTypes.ENUM('ALL', 'STUDENTS', 'TEACHERS', 'SPECIFIC_USER'),
      allowNull: false,
      defaultValue: 'ALL',
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    createdByAdminId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approvedByAdminId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      { fields: ['targetUserId'] },
    ],
  }
);

import User from './User';

Notification.belongsTo(User, { as: 'targetUser', foreignKey: 'targetUserId' });
Notification.belongsTo(User, { as: 'createdBy', foreignKey: 'createdByAdminId' });
Notification.belongsTo(User, { as: 'approvedBy', foreignKey: 'approvedByAdminId' });

export default Notification;
