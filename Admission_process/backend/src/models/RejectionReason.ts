import { DataTypes, Model } from 'sequelize';
import db from '../config/database';

class RejectionReason extends Model {
  public code!: string;
  public label!: string;
  public description!: string;
}

RejectionReason.init(
  {
    code: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'rejection_reasons',
    timestamps: true,
  }
);

export default RejectionReason;
