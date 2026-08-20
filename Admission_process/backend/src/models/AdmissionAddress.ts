import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Admission from './Admission';

class AdmissionAddress extends Model {
  public id!: string;
  public admissionId!: string;
  public currentAddressLine1!: string;
  public currentCity!: string;
  public currentTaluk?: string;
  public currentDistrict?: string;
  public currentDistrictId?: string;
  public currentState!: string;
  public currentPincode!: string;
  public permanentAddressLine1!: string;
  public permanentCity!: string;
  public permanentTaluk?: string;
  public permanentDistrict?: string;
  public permanentDistrictId?: string;
  public permanentState!: string;
  public permanentPincode!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AdmissionAddress.init(
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
    currentAddressLine1: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    currentCity: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    currentTaluk: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    currentDistrict: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    currentDistrictId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    currentState: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    currentPincode: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    permanentAddressLine1: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    permanentCity: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    permanentTaluk: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    permanentDistrict: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    permanentDistrictId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    permanentState: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    permanentPincode: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: 'admission_addresses',
    timestamps: true,
  }
);

// Establish bidirectional association
AdmissionAddress.belongsTo(Admission, { as: 'admission', foreignKey: 'admissionId' });
Admission.hasOne(AdmissionAddress, { as: 'studentaddress', foreignKey: 'admissionId', onDelete: 'CASCADE' });

export default AdmissionAddress;
