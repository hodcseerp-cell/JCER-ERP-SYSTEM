import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Student from './Student';
import User from './User';
import MentorAssignment from './MentorAssignment';

export type MentoringMeetingType = 'IN_PERSON' | 'ONLINE' | 'PHONE' | 'OTHER';
export type MentoringConcernCategory = 'ACADEMIC' | 'ATTENDANCE' | 'DISCIPLINARY' | 'CAREER' | 'PERSONAL' | 'GENERAL';
export type MentoringFollowUpStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'NO_ACTION_REQUIRED';

class MentoringRecord extends Model {
  public id!: string;
  public studentId!: string;
  public mentorAssignmentId!: string | null;
  public facultyId!: string;
  public meetingDate!: Date;
  public meetingType!: MentoringMeetingType;
  public concernCategory!: MentoringConcernCategory;
  public summary!: string;
  public actionPlan!: string | null;
  public followUpDate!: Date | null;
  public followUpStatus!: MentoringFollowUpStatus;
  public resolutionNotes!: string | null;
  public resolvedAt!: Date | null;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public student?: Student;
  public mentorAssignment?: MentorAssignment;
  public faculty?: User;
  public creator?: User;
}

MentoringRecord.init(
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
    mentorAssignmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'mentor_assignments',
        key: 'id',
      },
      onDelete: 'SET NULL',
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
    meetingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    meetingType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'IN_PERSON',
    },
    concernCategory: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'GENERAL',
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    actionPlan: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    followUpDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    followUpStatus: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'OPEN',
    },
    resolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize: db,
    tableName: 'mentoring_records',
    timestamps: true,
    indexes: [
      { fields: ['studentId'] },
      { fields: ['facultyId'] },
      { fields: ['mentorAssignmentId'] },
      { fields: ['meetingDate'] },
      { fields: ['followUpStatus'] },
      { fields: ['followUpDate'] },
    ],
  }
);

MentoringRecord.belongsTo(Student, { as: 'student', foreignKey: 'studentId' });
MentoringRecord.belongsTo(MentorAssignment, { as: 'mentorAssignment', foreignKey: 'mentorAssignmentId' });
MentoringRecord.belongsTo(User, { as: 'faculty', foreignKey: 'facultyId' });
MentoringRecord.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

Student.hasMany(MentoringRecord, { as: 'mentoringRecords', foreignKey: 'studentId' });
User.hasMany(MentoringRecord, { as: 'conductedMentoringRecords', foreignKey: 'facultyId' });

export default MentoringRecord;
