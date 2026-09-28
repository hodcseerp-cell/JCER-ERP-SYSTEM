import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import FacultyAssignment from './FacultyAssignment';

class GoogleSheetResource extends Model {
  public id!: string;
  public facultyAssignmentId!: string | null;
  public sheetType!: 'ATTENDANCE' | 'ACADEMIC_MARKS';
  public googleSpreadsheetId!: string;
  public googleSheetTabId!: string;
  public sheetUrl!: string;
  public status!: 'ACTIVE' | 'INACTIVE' | 'MAPPED' | 'NOT_MAPPED' | 'ERROR';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GoogleSheetResource.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    sheetType: {
      type: DataTypes.ENUM('ATTENDANCE', 'ACADEMIC_MARKS'),
      allowNull: false,
      defaultValue: 'ACADEMIC_MARKS',
    },
    googleSpreadsheetId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    googleSheetTabId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    sheetUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'MAPPED', 'NOT_MAPPED', 'ERROR'),
      allowNull: false,
      defaultValue: 'NOT_MAPPED',
    },
  },
  {
    sequelize: db,
    tableName: 'google_sheet_resources',
    timestamps: true,
    indexes: [
      { fields: ['facultyAssignmentId'] },
      { fields: ['googleSpreadsheetId'] },
      { fields: ['googleSheetTabId'] },
    ],
  }
);

GoogleSheetResource.belongsTo(FacultyAssignment, { as: 'facultyAssignment', foreignKey: 'facultyAssignmentId' });
FacultyAssignment.hasMany(GoogleSheetResource, { as: 'sheetResources', foreignKey: 'facultyAssignmentId' });

export default GoogleSheetResource;
