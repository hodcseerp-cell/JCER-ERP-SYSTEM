import { DataTypes, Model } from 'sequelize';
import db from '../config/database';

export type OtpPurpose = 'REGISTER' | 'FORGOT_PASSWORD' | 'DAILY_LOGIN';

export class Otp extends Model {
  public id!: string;
  public email!: string;
  public otpHash!: string;
  public purpose!: OtpPurpose;
  public expiresAt!: Date;
  public verified!: boolean;
  public attempts!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Otp.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    otpHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    purpose: {
      type: DataTypes.ENUM('REGISTER', 'FORGOT_PASSWORD', 'DAILY_LOGIN'),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize: db,
    tableName: 'otps',
    timestamps: true,
    indexes: [
      {
        fields: ['email', 'purpose', 'verified'],
      },
      {
        fields: ['expiresAt'],
      },
    ],
  }
);

export default Otp;
