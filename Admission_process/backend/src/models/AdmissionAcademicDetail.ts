import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Admission from './Admission';

class AdmissionAcademicDetail extends Model {
  public id!: string;
  public admissionId!: string;
  public tenthSchool!: string;
  public tenthBoard!: string;
  public tenthPassingYear!: string;
  public tenthRegisterNumber!: string;
  public tenthMarksObtained!: number;
  public tenthMaxMarks!: number;
  public tenthPercentage!: number;
  public tenthAttempts!: number;
  public tenthSubjectMarks!: any; // JSON
  public twelfthSchool!: string | null;
  public twelfthBoard!: string | null;
  public twelfthPassingYear!: string | null;
  public twelfthRegisterNumber!: string | null;
  public twelfthStream!: string | null;
  public physicsMarks!: number | null;
  public mathsMarks!: number | null;
  public chemistryMarks!: number | null;
  public optionalSubject!: string | null;
  public optionalMarks!: number | null;
  public twelfthMaxMarks!: number | null;
  public twelfthAggregate!: number | null;
  public twelfthPercentage!: number | null;
  public twelfthAttempts!: number | null;
  public diplomaUniversity!: string | null;
  public diplomaYear!: string | null;
  public diplomaRegisterNumber!: string | null;
  public diplomaFinalYearMaxMarks!: number | null;
  public diplomaFinalYearObtained!: number | null;
  public diplomaPercentage!: number | null;
  public diplomaAttempts!: number | null;
  public cetScore!: number | null;
  public cetRank!: number | null;
  public cetYear!: number | null;
  public hasGap!: boolean | null;
  public gapReason!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AdmissionAcademicDetail.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    admissionId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: Admission, key: 'id' },
      onDelete: 'CASCADE',
    },
    tenthSchool: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tenthBoard: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    tenthPassingYear: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    tenthRegisterNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    tenthMarksObtained: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tenthMaxMarks: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tenthPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    tenthAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    tenthSubjectMarks: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    twelfthSchool: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    twelfthBoard: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    twelfthPassingYear: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    twelfthRegisterNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    twelfthStream: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    physicsMarks: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mathsMarks: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    chemistryMarks: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    optionalSubject: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    optionalMarks: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    twelfthMaxMarks: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    twelfthAggregate: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    twelfthPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    twelfthAttempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    diplomaUniversity: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    diplomaYear: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    diplomaRegisterNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    diplomaFinalYearMaxMarks: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    diplomaFinalYearObtained: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    diplomaPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    diplomaAttempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cetScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cetRank: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cetYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    hasGap: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    gapReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'admission_academic_details',
    timestamps: true,
  }
);

// Establish bidirectional association
AdmissionAcademicDetail.belongsTo(Admission, { as: 'admission', foreignKey: 'admissionId' });
Admission.hasOne(AdmissionAcademicDetail, { as: 'studentacademicdetails', foreignKey: 'admissionId', onDelete: 'CASCADE' });

export default AdmissionAcademicDetail;
