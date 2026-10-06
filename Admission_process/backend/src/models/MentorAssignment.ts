import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Student from './Student';
import User from './User';
import Department from './Department';

export type MentorAssignmentStatus = 'ACTIVE' | 'INACTIVE' | 'REASSIGNED' | 'COMPLETED';
export type MentorshipPhase = 'PHASE_1' | 'PHASE_2';

class MentorAssignment extends Model {
  public id!: string;
  public studentId!: string;
  public facultyId!: string;
  public assignedByHodId!: string;
  public academicYear!: string;
  public semester!: number;
  public phase!: MentorshipPhase;
  public startSemester!: number;
  public endSemester!: number | null;
  public admissionBatch!: string | null;
  public departmentId!: string;
  public mentorDepartmentId!: string;
  public status!: MentorAssignmentStatus;
  public assignedAt!: Date;
  public reassignedAt!: Date | null;
  public reassignmentReason!: string | null;
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public student?: Student;
  public faculty?: User;
  public assignedByHod?: User;
  public department?: Department;
  public mentorDepartment?: Department;
}

MentorAssignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    facultyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    assignedByHodId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    academicYear: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: '2026-27',
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    phase: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PHASE_1',
    },
    startSemester: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    endSemester: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 2,
    },
    admissionBatch: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'id',
      },
    },
    mentorDepartmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    reassignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    reassignmentReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize: db,
    tableName: 'mentor_assignments',
    timestamps: true,
    indexes: [
      { fields: ['studentId'] },
      { fields: ['facultyId'] },
      { fields: ['departmentId'] },
      { fields: ['mentorDepartmentId'] },
      { fields: ['academicYear'] },
      { fields: ['semester'] },
      { fields: ['phase'] },
      { fields: ['admissionBatch'] },
      { fields: ['status'] },
      { fields: ['studentId', 'status'] },
    ],
  }
);

MentorAssignment.belongsTo(Student, { as: 'student', foreignKey: 'studentId' });
MentorAssignment.belongsTo(User, { as: 'faculty', foreignKey: 'facultyId' });
MentorAssignment.belongsTo(User, { as: 'assignedByHod', foreignKey: 'assignedByHodId' });
MentorAssignment.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
MentorAssignment.belongsTo(Department, { as: 'mentorDepartment', foreignKey: 'mentorDepartmentId' });

Student.hasMany(MentorAssignment, { as: 'mentorAssignments', foreignKey: 'studentId' });
User.hasMany(MentorAssignment, { as: 'menteeAssignments', foreignKey: 'facultyId' });

export default MentorAssignment;
