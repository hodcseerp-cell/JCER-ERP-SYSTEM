import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import GoogleSheetConnection from './GoogleSheetConnection';
import Subject from './Subject';

export type TabStatus = 'MAPPED' | 'UNMAPPED' | 'PENDING_MAPPING' | 'IGNORED';

class GoogleSheetTab extends Model {
  public id!: string;
  public googleSheetConnectionId!: string;
  public googleSpreadsheetId!: string | null;
  public googleSheetId!: string; // Immutable Google tab GID
  public sheetTitle!: string; // Display name e.g. "CS301", "CS302", "BCS305", "Final"
  public sheetIndex!: number;
  public sheetType!: string | null;
  public subjectId!: string | null;
  public subjectCode!: string | null;
  public status!: TabStatus;
  public isHidden!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GoogleSheetTab.init(
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
    googleSpreadsheetId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    googleSheetId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    sheetTitle: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    sheetIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    sheetType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subjects',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    subjectCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('MAPPED', 'UNMAPPED', 'PENDING_MAPPING', 'IGNORED'),
      allowNull: false,
      defaultValue: 'UNMAPPED',
    },
    isHidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize: db,
    tableName: 'google_sheet_tabs',
    timestamps: true,
    indexes: [
      { fields: ['googleSheetConnectionId'] },
      { fields: ['googleSpreadsheetId'] },
      { fields: ['googleSheetId'] },
      { fields: ['subjectId'] },
      { fields: ['subjectCode'] },
      { fields: ['status'] },
    ],
  }
);

GoogleSheetTab.belongsTo(GoogleSheetConnection, { as: 'connection', foreignKey: 'googleSheetConnectionId' });
GoogleSheetConnection.hasMany(GoogleSheetTab, { as: 'tabs', foreignKey: 'googleSheetConnectionId' });
GoogleSheetTab.belongsTo(Subject, { as: 'subject', foreignKey: 'subjectId' });

export default GoogleSheetTab;
