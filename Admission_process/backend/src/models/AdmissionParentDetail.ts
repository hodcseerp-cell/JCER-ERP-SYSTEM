import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Admission from './Admission';

class AdmissionParentDetail extends Model {
  public id!: string;
  public admissionId!: string;
  public fatherName!: string;
  public fatherOccupation!: string | null;
  public fatherPhone!: string | null;
  public fatherEmail!: string | null;
  public fatherAnnualIncome!: number | string | null;
  public motherName!: string;
  public motherOccupation!: string | null;
  public motherPhone!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AdmissionParentDetail.init(
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
    fatherName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fatherOccupation: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    fatherPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    fatherEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    fatherAnnualIncome: {
      type: DataTypes.DECIMAL(38, 2),
      allowNull: true,
    },
    motherName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    motherOccupation: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    motherPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'admission_parent_details',
    timestamps: true,
  }
);

// Establish bidirectional association
AdmissionParentDetail.belongsTo(Admission, { as: 'admission', foreignKey: 'admissionId' });
Admission.hasOne(AdmissionParentDetail, { as: 'studentparentdetails', foreignKey: 'admissionId', onDelete: 'CASCADE' });

export default AdmissionParentDetail;
