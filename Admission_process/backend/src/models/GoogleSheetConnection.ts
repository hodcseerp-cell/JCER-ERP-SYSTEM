import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Department from './Department';
import User from './User';

export type SheetType = 'ATTENDANCE' | 'ACADEMIC_MARKS';
export type ConnectionStatus = 'ACTIVE' | 'DISCONNECTED' | 'ERROR';

class GoogleSheetConnection extends Model {
  public id!: string;
  public departmentId!: string;
  public academicYear!: string;
  public semester!: number;
  public section!: string | null;
  public sheetType!: SheetType;
  public googleSpreadsheetId!: string;
  public googleSpreadsheetUrl!: string;
  public googleAccountEmail!: string;
  public googleAccountId!: string | null;
  public status!: ConnectionStatus;
  public connectedBy!: string | null;
  public connectedAt!: Date;
  public disconnectedBy!: string | null;
  public disconnectedAt!: Date | null;
  public lastSyncedAt!: Date | null;
  public connectedByUser?: any;
  public disconnectedByUser?: any;
  public tabs?: any[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GoogleSheetConnection.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'id',
      },
    },
    academicYear: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '2026-27',
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    section: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'A',
    },
    sheetType: {
      type: DataTypes.ENUM('ATTENDANCE', 'ACADEMIC_MARKS'),
      allowNull: false,
    },
    googleSpreadsheetId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    googleSpreadsheetUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    googleAccountEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    googleAccountId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'DISCONNECTED', 'ERROR'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    connectedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    connectedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    disconnectedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    disconnectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'google_sheet_connections',
    timestamps: true,
    indexes: [
      { fields: ['departmentId'] },
      { fields: ['academicYear'] },
      { fields: ['semester'] },
      { fields: ['section'] },
      { fields: ['sheetType'] },
      { fields: ['status'] },
      { fields: ['googleSpreadsheetId'] },
    ],
  }
);

GoogleSheetConnection.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
GoogleSheetConnection.belongsTo(User, { as: 'connectedByUser', foreignKey: 'connectedBy' });
GoogleSheetConnection.belongsTo(User, { as: 'disconnectedByUser', foreignKey: 'disconnectedBy' });

export default GoogleSheetConnection;
