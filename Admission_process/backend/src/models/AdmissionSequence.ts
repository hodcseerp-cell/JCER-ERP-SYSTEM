import { DataTypes, Model } from 'sequelize';
import db from '../config/database';

class AdmissionSequence extends Model {
  public id!: string;
  public academicYear!: string;
  public lastSequence!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AdmissionSequence.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    academicYear: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    lastSequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize: db,
    tableName: 'admission_sequences',
    timestamps: true,
    indexes: [
      { fields: ['academicYear'], unique: true },
    ],
  }
);

export default AdmissionSequence;
