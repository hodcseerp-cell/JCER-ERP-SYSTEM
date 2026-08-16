import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import ProvisionalAdmission from './ProvisionalAdmission';

class ProvisionalAdmissionSemesterRecord extends Model {
  public id!: string;
  public provisionalAdmissionId!: string;
  public semesterNumber!: number;
  public examMonth!: string;
  public examYear!: number;
  public subjectsPassed!: number;
  public subjectsFailed!: number;
  public failedSubjectCodes!: string[] | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProvisionalAdmissionSemesterRecord.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    provisionalAdmissionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: ProvisionalAdmission, key: 'id' },
      onDelete: 'CASCADE',
    },
    semesterNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    examMonth: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    examYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subjectsPassed: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subjectsFailed: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    failedSubjectCodes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'provisional_admission_semester_records',
    timestamps: true,
    indexes: [
      { fields: ['provisionalAdmissionId'] },
    ],
  }
);

// Associations
ProvisionalAdmissionSemesterRecord.belongsTo(ProvisionalAdmission, { as: 'provisionalAdmission', foreignKey: 'provisionalAdmissionId' });
ProvisionalAdmission.hasMany(ProvisionalAdmissionSemesterRecord, { as: 'semesterRecords', foreignKey: 'provisionalAdmissionId', onDelete: 'CASCADE' });

export default ProvisionalAdmissionSemesterRecord;
