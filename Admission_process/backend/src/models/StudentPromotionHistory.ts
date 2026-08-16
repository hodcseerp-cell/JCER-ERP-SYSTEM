import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Student from './Student';
import User from './User';
import PromotionBatch from './PromotionBatch';

class StudentPromotionHistory extends Model {
  public id!: string;
  public studentId!: string;
  public fromSemester!: number;
  public toSemester!: number;
  public academicYear!: string;
  public promotedBy!: string;
  public remarks!: string | null;
  public promotionBatchId!: string | null;
  public source!: 'ADMIN_BULK' | 'ADMIN_SINGLE';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StudentPromotionHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Student,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    fromSemester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    toSemester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    academicYear: {
      type: DataTypes.STRING(30),
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
    promotionBatchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: PromotionBatch,
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'ADMIN_BULK',
    },
  },
  {
    sequelize: db,
    tableName: 'student_promotion_histories',
    timestamps: true,
    indexes: [
      {
        fields: ['studentId'],
      },
      {
        fields: ['promotionBatchId'],
      },
      {
        fields: ['academicYear'],
      },
    ],
  }
);

StudentPromotionHistory.belongsTo(Student, { as: 'student', foreignKey: 'studentId' });
StudentPromotionHistory.belongsTo(User, { as: 'operator', foreignKey: 'promotedBy' });
StudentPromotionHistory.belongsTo(PromotionBatch, { as: 'batch', foreignKey: 'promotionBatchId' });

export default StudentPromotionHistory;
