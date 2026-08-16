import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import User from './User';

class PromotionBatch extends Model {
  public id!: string;
  public academicYear!: string;
  public fromSemester!: number;
  public toSemester!: number;
  public promotedBy!: string;
  public remarks!: string | null;
  public studentCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PromotionBatch.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    academicYear: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    fromSemester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    toSemester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    promotedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    studentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize: db,
    tableName: 'promotion_batches',
    timestamps: true,
    indexes: [
      {
        fields: ['academicYear'],
      },
      {
        fields: ['fromSemester', 'toSemester'],
      },
      {
        fields: ['promotedBy'],
      },
    ],
  }
);

PromotionBatch.belongsTo(User, { as: 'operator', foreignKey: 'promotedBy' });

export default PromotionBatch;
