import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Student from './Student';

class Fee extends Model {
  public id!: string;
  public studentId!: string;
  public academicYear!: string;
  public semester!: number;
  public totalAmount!: number;
  public paidAmount!: number;
  public dueDate!: Date;
  public status!: 'PENDING' | 'PAID' | 'OVERDUE';
  public createdAt!: Date;
}

Fee.init(
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
    academicYear: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'OVERDUE'),
      defaultValue: 'PENDING',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: db,
    tableName: 'fees',
    timestamps: false,
    indexes: [
      {
        fields: ['studentId'],
      },
    ],
  }
);

Fee.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

export default Fee;