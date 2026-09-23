import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Department from './Department';

class Section extends Model {
  public id!: string;
  public departmentId!: string;
  public semester!: number;
  public academicYear!: string;
  public name!: string;
  public capacity!: number;
  public status!: 'ACTIVE' | 'INACTIVE';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Section.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'id',
      },
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    academicYear: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
  },
  {
    sequelize: db,
    tableName: 'sections',
    timestamps: true,
    indexes: [
      { fields: ['departmentId', 'semester', 'academicYear', 'name'], unique: true },
      { fields: ['status'] },
    ],
  }
);

Section.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });

export default Section;
