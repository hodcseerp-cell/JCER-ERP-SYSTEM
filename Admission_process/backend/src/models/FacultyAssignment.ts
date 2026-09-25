import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import User from './User';
import Department from './Department';
import Subject from './Subject';
import Teacher from './Teacher';

class FacultyAssignment extends Model {
  public id!: string;
  public teacherId!: string | null;
  public userId!: string;
  public departmentId!: string;
  public subjectId!: string;
  public semester!: number;
  public section!: string;
  public academicYear!: string;
  public attendanceAccess!: boolean;
  public marksAccess!: boolean;
  public googleSheetsAccess!: boolean;
  public createdByHODId!: string | null;
  public status!: 'ACTIVE' | 'INACTIVE';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FacultyAssignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    teacherId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'teachers',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
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
      allowNull: false,
      defaultValue: 'A',
    },
    academicYear: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    attendanceAccess: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    marksAccess: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    googleSheetsAccess: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdByHODId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
  },
  {
    sequelize: db,
    tableName: 'faculty_assignments',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['departmentId'] },
      { fields: ['subjectId'] },
      { fields: ['academicYear'] },
      { fields: ['status'] },
    ],
  }
);

FacultyAssignment.belongsTo(User, { as: 'user', foreignKey: 'userId' });
FacultyAssignment.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
FacultyAssignment.belongsTo(Subject, { as: 'subject', foreignKey: 'subjectId' });
FacultyAssignment.belongsTo(Teacher, { as: 'teacher', foreignKey: 'teacherId' });

export default FacultyAssignment;
