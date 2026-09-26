import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import User from './User';
import FacultyAssignment from './FacultyAssignment';
import GoogleSheetConnection from './GoogleSheetConnection';

export type FacultyAccessStatus = 'PENDING' | 'GRANTED' | 'REVOKED' | 'FAILED';
export type GoogleAccessRole = 'reader' | 'writer' | 'owner' | 'commenter';

class FacultyGoogleSheetAccess extends Model {
  public id!: string;
  public facultyId!: string;
  public facultyAssignmentId!: string;
  public googleSheetConnectionId!: string;
  public section!: string | null;
  public googleEmail!: string;
  public permissionId!: string | null;
  public accessRole!: GoogleAccessRole;
  public status!: FacultyAccessStatus;
  public invitationSentAt!: Date | null;
  public grantedAt!: Date | null;
  public revokedAt!: Date | null;
  public lastVerifiedAt!: Date | null;
  public grantedBy!: string | null;
  public revokedBy!: string | null;
  public failureReason!: string | null;
  public googleSheetConnection?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FacultyGoogleSheetAccess.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    facultyAssignmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'faculty_assignments',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    googleSheetConnectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'google_sheet_connections',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    section: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'A',
    },
    googleEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    permissionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    accessRole: {
      type: DataTypes.ENUM('reader', 'writer', 'owner', 'commenter'),
      allowNull: false,
      defaultValue: 'writer',
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'GRANTED', 'REVOKED', 'FAILED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    invitationSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    grantedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    grantedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    revokedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'faculty_google_sheet_access',
    timestamps: true,
    indexes: [
      { fields: ['facultyId'] },
      { fields: ['facultyAssignmentId'] },
      { fields: ['googleSheetConnectionId'] },
      { fields: ['googleEmail'] },
      { fields: ['status'] },
    ],
  }
);

FacultyGoogleSheetAccess.belongsTo(User, { as: 'facultyUser', foreignKey: 'facultyId' });
FacultyGoogleSheetAccess.belongsTo(FacultyAssignment, { as: 'facultyAssignment', foreignKey: 'facultyAssignmentId' });
FacultyGoogleSheetAccess.belongsTo(GoogleSheetConnection, { as: 'googleSheetConnection', foreignKey: 'googleSheetConnectionId' });
FacultyGoogleSheetAccess.belongsTo(User, { as: 'grantedByUser', foreignKey: 'grantedBy' });
FacultyGoogleSheetAccess.belongsTo(User, { as: 'revokedByUser', foreignKey: 'revokedBy' });

FacultyAssignment.hasMany(FacultyGoogleSheetAccess, { as: 'googleSheetAccesses', foreignKey: 'facultyAssignmentId' });
GoogleSheetConnection.hasMany(FacultyGoogleSheetAccess, { as: 'facultyAccesses', foreignKey: 'googleSheetConnectionId' });

export default FacultyGoogleSheetAccess;
