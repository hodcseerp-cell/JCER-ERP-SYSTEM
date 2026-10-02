import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import FacultyAssignment from './FacultyAssignment';
import Department from './Department';
import Subject from './Subject';
import Section from './Section';
import User from './User';

class AttendanceSession extends Model {
  public id!: string;
  public facultyAssignmentId!: string;
  public departmentId!: string;
  public subjectId!: string;
  public sectionId!: string | null;
  public section!: string;
  public semester!: number;
  public academicYear!: string;
  public attendanceDate!: string;
  public sessionPeriod!: number;
  public status!: 'DRAFT' | 'SUBMITTED' | 'LOCKED';
  public totalStudents!: number;
  public presentCount!: number;
  public absentCount!: number;
  public submittedAt!: Date | null;
  public submittedById!: string | null;
  public lockedAt!: Date | null;
  public lockedById!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AttendanceSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    facultyAssignmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'faculty_assignments',
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
    sectionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'sections',
        key: 'id',
      },
    },
    section: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'A',
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    academicYear: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    attendanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    sessionPeriod: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'LOCKED'),
      allowNull: false,
      defaultValue: 'SUBMITTED',
    },
    totalStudents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    presentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    absentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    submittedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lockedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize: db,
    tableName: 'attendance_sessions',
    timestamps: true,
    indexes: [
      { fields: ['facultyAssignmentId'] },
      { fields: ['departmentId'] },
      { fields: ['subjectId'] },
      { fields: ['attendanceDate'] },
      { fields: ['status'] },
      {
        fields: ['facultyAssignmentId', 'attendanceDate', 'sessionPeriod'],
        unique: true,
        name: 'attendance_sessions_faculty_assignment_id_date_period_unique',
      },
    ],
  }
);

AttendanceSession.belongsTo(FacultyAssignment, { as: 'facultyAssignment', foreignKey: 'facultyAssignmentId' });
AttendanceSession.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
AttendanceSession.belongsTo(Subject, { as: 'subject', foreignKey: 'subjectId' });
AttendanceSession.belongsTo(Section, { as: 'sectionRef', foreignKey: 'sectionId' });
AttendanceSession.belongsTo(User, { as: 'submittedBy', foreignKey: 'submittedById' });
AttendanceSession.belongsTo(User, { as: 'lockedBy', foreignKey: 'lockedById' });

export default AttendanceSession;
