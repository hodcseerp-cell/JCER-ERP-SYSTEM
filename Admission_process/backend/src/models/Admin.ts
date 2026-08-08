import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import User from './User';

class Admin extends Model {
  public id!: string;
  public userId!: string;
  public designation!: string | null;
  public employeeId!: string | null;
  public user?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Admin.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'Admission Officer',
    },
    employeeId: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'admins',
    timestamps: true,
  }
);

Admin.belongsTo(User, { as: 'user', foreignKey: 'userId' });

export default Admin;
