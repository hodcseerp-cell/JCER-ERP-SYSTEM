import { DataTypes, Model } from 'sequelize';
import db from '../config/database';

class Parent extends Model {
  public id!: string;
  public userId!: string;
  public studentId!: string;
  public relation!: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  public occupation!: string | null;
  public annualIncome!: number | null;
  public isPrimaryContact!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Parent.init(
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
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    relation: {
      type: DataTypes.ENUM('FATHER', 'MOTHER', 'GUARDIAN'),
      allowNull: false,
    },
    occupation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    annualIncome: {
      type: DataTypes.DECIMAL(38, 2),
      allowNull: true,
    },
    isPrimaryContact: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize: db,
    tableName: 'parents',
    timestamps: true,
  }
);

import User from './User';
import Student from './Student';

Parent.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Parent.belongsTo(Student, { as: 'student', foreignKey: 'studentId' });

export default Parent;
