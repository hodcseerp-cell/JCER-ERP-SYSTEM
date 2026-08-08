import { DataTypes, Model } from 'sequelize';
import db from '../config/database';

class HOD extends Model {
  public id!: string;
  public userId!: string;
  public departmentId!: string;
  public tenureStartDate!: Date;
  public isActive!: boolean;
  public appointedByAdminId!: string | null;
  public appointmentOrderNo!: string | null;
  public appointmentDate!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

HOD.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    tenureStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    appointedByAdminId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    appointmentOrderNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    appointmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'hods',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'departmentId'],
        name: 'unique_user_department_hod',
      },
    ],
  }
);

import User from './User';
import Department from './Department';

HOD.belongsTo(User, { as: 'user', foreignKey: 'userId' });
HOD.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
HOD.belongsTo(User, { as: 'appointedBy', foreignKey: 'appointedByAdminId' });

export default HOD;
