import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Department from './Department';
import Subject from './Subject';

class Assessment extends Model {
  public id!: string;
  public departmentId!: string;
  public subjectId!: string;
  public semester!: number;
  public section!: string | null;
  public academicYear!: string;
  public name!: string;
  public maxMarks!: number;
  public status!: 'ACTIVE' | 'ARCHIVED';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Assessment.init(
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
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id',
      },
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    section: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    academicYear: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    maxMarks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 50.0,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'ARCHIVED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
  },
  {
    sequelize: db,
    tableName: 'assessments',
    timestamps: true,
    indexes: [
      { fields: ['departmentId'] },
      { fields: ['subjectId'] },
      { fields: ['semester'] },
      { fields: ['academicYear'] },
      { fields: ['status'] },
    ],
  }
);

Assessment.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
Assessment.belongsTo(Subject, { as: 'subject', foreignKey: 'subjectId' });

export default Assessment;
