import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Admission from './Admission';

class AdmissionPersonalDetail extends Model {
  public id!: string;
  public admissionId!: string;
  public firstName!: string;
  public middleName!: string | null;
  public lastName!: string;
  public caste!: string | null;
  public dateOfBirth!: string | null;
  public gender!: string | null;
  public category!: string | null;
  public religion!: string | null;
  public nationality!: string | null;
  public studiedInKarnataka!: boolean | null;
  public areaType!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AdmissionPersonalDetail.init(
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
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    middleName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    caste: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.STRING(20), // stored as string (e.g. "12/05/2004") — parsed by service layer
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    religion: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    nationality: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    studiedInKarnataka: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    areaType: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'admission_personal_details',
    timestamps: true,
  }
);

// Establish bidirectional association
AdmissionPersonalDetail.belongsTo(Admission, { as: 'admission', foreignKey: 'admissionId' });
Admission.hasOne(AdmissionPersonalDetail, { as: 'studentpersonaldetails', foreignKey: 'admissionId', onDelete: 'CASCADE' });

export default AdmissionPersonalDetail;
