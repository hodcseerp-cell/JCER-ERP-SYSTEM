import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import GoogleSheetConnection from './GoogleSheetConnection';
import FacultyAssignment from './FacultyAssignment';
import GoogleSheetTab from './GoogleSheetTab';
import User from './User';

export type SyncLogStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

class GoogleSheetSyncLog extends Model {
  public id!: string;
  public googleSheetConnectionId!: string;
  public facultyAssignmentId!: string | null;
  public sheetTabId!: string | null;
  public syncType!: 'ATTENDANCE' | 'ACADEMIC_MARKS';
  public startedAt!: Date;
  public completedAt!: Date | null;
  public status!: SyncLogStatus;
  public recordsProcessed!: number;
  public recordsCreated!: number;
  public recordsUpdated!: number;
  public recordsRejected!: number;
  public errorCount!: number;
  public errorSummary!: any; // JSON Array of errors with row_number, error_code, error_message, source_value
  public triggeredBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GoogleSheetSyncLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    facultyAssignmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'faculty_assignments',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    sheetTabId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'google_sheet_tabs',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    syncType: {
      type: DataTypes.ENUM('ATTENDANCE', 'ACADEMIC_MARKS'),
      allowNull: false,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED'),
      allowNull: false,
      defaultValue: 'RUNNING',
    },
    recordsProcessed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    recordsCreated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    recordsUpdated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    recordsRejected: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    errorCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    errorSummary: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    triggeredBy: {
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
    tableName: 'google_sheet_sync_logs',
    timestamps: true,
    indexes: [
      { fields: ['googleSheetConnectionId'] },
      { fields: ['facultyAssignmentId'] },
      { fields: ['syncType'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
    ],
  }
);

GoogleSheetSyncLog.belongsTo(GoogleSheetConnection, { as: 'connection', foreignKey: 'googleSheetConnectionId' });
GoogleSheetSyncLog.belongsTo(FacultyAssignment, { as: 'facultyAssignment', foreignKey: 'facultyAssignmentId' });
GoogleSheetSyncLog.belongsTo(GoogleSheetTab, { as: 'tab', foreignKey: 'sheetTabId' });
GoogleSheetSyncLog.belongsTo(User, { as: 'triggeredByUser', foreignKey: 'triggeredBy' });

export default GoogleSheetSyncLog;
