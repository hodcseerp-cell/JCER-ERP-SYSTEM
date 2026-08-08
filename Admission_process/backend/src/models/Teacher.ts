import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import User from './User';
import Department from './Department';

class Teacher extends Model {
  public id!: string;
  public userId!: string;
  public departmentId!: string;
  public designation!: string;
  public joiningDate!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Teacher.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Department,
        key: 'id',
      },
    },
    designation: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    joiningDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: db,
    tableName: 'teachers',
    timestamps: true,
  }
);

Teacher.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Teacher.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });

export default Teacher;
