import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import User from './User';
import Department from './Department';
import Subject from './Subject';

class FacultyAuthorizationRequest extends Model {
  public id!: string;
  public facultyUserId!: string;
  public departmentId!: string;
  public subjectId!: string | null;
  public semester!: number;
  public section!: string;
  public academicYear!: string;
  public designation!: string;
  public createdByHODId!: string;
  public authority!: 'DEAN' | 'PRINCIPAL';
  public status!: 'PENDING' | 'APPROVED' | 'REJECTED';
  public rejectionReason!: string | null;
  public decidedByUserId!: string | null;
  public decidedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FacultyAuthorizationRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    facultyUserId: {
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
      allowNull: true,
      references: {
        model: 'subjects',
        key: 'id',
      },
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
    designation: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Assistant Professor',
    },
    createdByHODId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    authority: {
      type: DataTypes.ENUM('DEAN', 'PRINCIPAL'),
      allowNull: false,
      defaultValue: 'DEAN',
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    decidedByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    decidedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'faculty_authorization_requests',
    timestamps: true,
    indexes: [
      { fields: ['facultyUserId'] },
      { fields: ['departmentId'] },
      { fields: ['status'] },
      { fields: ['authority'] },
      { fields: ['academicYear'] },
    ],
  }
);

FacultyAuthorizationRequest.belongsTo(User, { as: 'faculty', foreignKey: 'facultyUserId' });
FacultyAuthorizationRequest.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
FacultyAuthorizationRequest.belongsTo(Subject, { as: 'subject', foreignKey: 'subjectId' });
FacultyAuthorizationRequest.belongsTo(User, { as: 'createdByHOD', foreignKey: 'createdByHODId' });
FacultyAuthorizationRequest.belongsTo(User, { as: 'decidedBy', foreignKey: 'decidedByUserId' });

export default FacultyAuthorizationRequest;
