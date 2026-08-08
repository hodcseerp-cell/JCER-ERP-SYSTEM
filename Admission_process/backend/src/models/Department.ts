import { DataTypes, Model } from 'sequelize';
import db from '../config/database';

class Department extends Model {
  public id!: string;
  public name!: string;
  public code!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Department.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize: db,
    tableName: 'departments',
    timestamps: true,
  }
);

export default Department;
