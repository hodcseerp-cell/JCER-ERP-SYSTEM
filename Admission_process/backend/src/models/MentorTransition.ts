import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Student from './Student';
import User from './User';
import Department from './Department';

export type MentorTransitionStatus = 'PENDING' | 'RESOLVED';
export type MentorTransitionDecision = 'CONTINUED_PREVIOUS' | 'ASSIGNED_NEW';

class MentorTransition extends Model {
  public id!: string;
  public studentId!: string;
  public departmentId!: string;
  public admissionBatch!: string;
  public fromPhase!: string;
  public toPhase!: string;
  public fromSemester!: number;
  public toSemester!: number;
  public previousFacultyId!: string | null;
  public newFacultyId!: string | null;
  public status!: MentorTransitionStatus;
  public decision!: MentorTransitionDecision | null;
  public resolvedByHodId!: string | null;
  public resolvedAt!: Date | null;
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public student?: Student;
  public department?: Department;
  public previousFaculty?: User;
  public newFaculty?: User;
  public resolvedByHod?: User;
}

MentorTransition.init(
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
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'id',
      },
    },
    admissionBatch: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: '2026-27',
    },
    fromPhase: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PHASE_1',
    },
    toPhase: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PHASE_2',
    },
    fromSemester: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },
    toSemester: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
    previousFacultyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    newFacultyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    decision: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null,
    },
    resolvedByHodId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    resolvedAt: {
      type: DataTypes.DATE,
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
    tableName: 'mentor_transitions',
    timestamps: true,
    indexes: [
      { fields: ['studentId'] },
      { fields: ['departmentId'] },
      { fields: ['status'] },
      { fields: ['admissionBatch'] },
      { fields: ['previousFacultyId'] },
      {
        unique: true,
        fields: ['studentId', 'toPhase'],
        name: 'unique_student_phase_transition',
      },
    ],
  }
);

MentorTransition.belongsTo(Student, { as: 'student', foreignKey: 'studentId' });
MentorTransition.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
MentorTransition.belongsTo(User, { as: 'previousFaculty', foreignKey: 'previousFacultyId' });
MentorTransition.belongsTo(User, { as: 'newFaculty', foreignKey: 'newFacultyId' });
MentorTransition.belongsTo(User, { as: 'resolvedByHod', foreignKey: 'resolvedByHodId' });

Student.hasMany(MentorTransition, { as: 'mentorTransitions', foreignKey: 'studentId' });

export default MentorTransition;
