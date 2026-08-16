import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import User from './User';
import Department from './Department';

class Student extends Model {
  public id!: string;
  public userId!: string;
  public usn!: string;
  public enrollmentNumber!: string;
  public rollNumber!: string;
  public batchYear!: number;
  public departmentId!: string;
  public semester!: number;
  public dateOfBirth!: Date;
  public address!: string;
  public fatherName!: string;
  public motherName!: string;
  public parentPhone!: string;
  public parentEmail!: string;
  public admissionStatus!: 'PENDING' | 'VALIDATED' | 'APPROVED' | 'REJECTED';
  public admissionType!: 'FRESH' | 'LATERAL';
  public initialSemester!: number;
  public currentAcademicYear!: string;
  public lastPromotedAt!: Date | null;
  public lastPromotedBy!: string | null;
  public user!: any;
  public department!: any;
  public admission?: any;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Student.init(
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
    usn: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    enrollmentNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    rollNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    batchYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Department,
        key: 'id',
      },
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fatherName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    motherName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    parentPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    parentEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    admissionStatus: {
      type: DataTypes.ENUM('PENDING', 'VALIDATED', 'APPROVED', 'REJECTED'),
      defaultValue: 'APPROVED',
    },
    admissionType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'FRESH',
    },
    initialSemester: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    currentAcademicYear: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: '2026-2027',
    },
    lastPromotedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastPromotedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: db,
    tableName: 'students',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['usn'],
      },
      {
        fields: ['enrollmentNumber'],
      },
      {
        fields: ['departmentId'],
      },
      {
        fields: ['semester'],
      },
    ],
  }
);

import Admission from './Admission';

// Associations
Student.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Student.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
User.hasOne(Student, { as: 'student', foreignKey: 'userId' });
Student.hasOne(Admission, { as: 'admission', foreignKey: 'userId', sourceKey: 'userId' });
Admission.belongsTo(Student, { as: 'student', foreignKey: 'userId', targetKey: 'userId' });

export default Student;