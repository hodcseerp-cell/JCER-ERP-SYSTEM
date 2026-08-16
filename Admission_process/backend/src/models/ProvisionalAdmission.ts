import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Student from './Student';
import User from './User';

class ProvisionalAdmission extends Model {
  public id!: string;
  public provisionalAdmissionNumber!: string;
  public studentId!: string;
  public semester!: number;
  public academicYear!: string;
  public status!: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CORRECTION_REQUIRED' | 'RESUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONFIRMED';
  public studentNameSnapshot!: string | null;
  public usnSnapshot!: string | null;
  public branchSnapshot!: string | null;
  public courseSnapshot!: string | null;
  public submittedAt!: Date | null;
  public reviewedAt!: Date | null;
  public approvedAt!: Date | null;
  public reviewedBy!: string | null;
  public approvedBy!: string | null;
  public correctionReason!: string | null;
  public rejectionReason!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public student?: any;
  public semesterRecords?: any[];
  public documents?: any[];
}

ProvisionalAdmission.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    provisionalAdmissionNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Student, key: 'id' },
      onDelete: 'CASCADE',
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    academicYear: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'CONFIRMED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    studentNameSnapshot: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    usnSnapshot: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    branchSnapshot: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    courseSnapshot: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: User, key: 'id' },
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: User, key: 'id' },
    },
    correctionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'provisional_admissions',
    timestamps: true,
    indexes: [
      { fields: ['studentId'] },
      { fields: ['status'] },
      { fields: ['provisionalAdmissionNumber'] },
    ],
  }
);

// Associations
ProvisionalAdmission.belongsTo(Student, { as: 'student', foreignKey: 'studentId' });
Student.hasMany(ProvisionalAdmission, { as: 'provisionalAdmissions', foreignKey: 'studentId', onDelete: 'CASCADE' });

export default ProvisionalAdmission;
