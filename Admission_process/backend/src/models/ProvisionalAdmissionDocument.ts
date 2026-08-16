import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import ProvisionalAdmission from './ProvisionalAdmission';
import User from './User';

class ProvisionalAdmissionDocument extends Model {
  public id!: string;
  public provisionalAdmissionId!: string;
  public documentType!: 'FEE_RECEIPT' | 'SEMESTER_MARKS_CARD';
  public semesterNumber!: number | null;
  public r2Key!: string;
  public originalFileName!: string;
  public mimeType!: string;
  public fileSize!: number;
  public verificationStatus!: 'PENDING' | 'VERIFIED' | 'REJECTED';
  public verificationRemarks!: string | null;
  public verifiedBy!: string | null;
  public verifiedAt!: Date | null;
  public readonly uploadedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProvisionalAdmissionDocument.init(
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
    documentType: {
      type: DataTypes.ENUM('FEE_RECEIPT', 'SEMESTER_MARKS_CARD'),
      allowNull: false,
    },
    semesterNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    r2Key: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    originalFileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    verificationStatus: {
      type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    verificationRemarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: User, key: 'id' },
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'provisional_admission_documents',
    timestamps: true,
    indexes: [
      { fields: ['provisionalAdmissionId'] },
    ],
  }
);

// Associations
ProvisionalAdmissionDocument.belongsTo(ProvisionalAdmission, { as: 'provisionalAdmission', foreignKey: 'provisionalAdmissionId' });
ProvisionalAdmission.hasMany(ProvisionalAdmissionDocument, { as: 'documents', foreignKey: 'provisionalAdmissionId', onDelete: 'CASCADE' });

export default ProvisionalAdmissionDocument;
