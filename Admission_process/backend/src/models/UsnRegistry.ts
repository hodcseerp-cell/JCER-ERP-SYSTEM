import { DataTypes, Model } from 'sequelize';
import db from '../config/database';

class UsnRegistry extends Model {
  public id!: string;
  public usn!: string;
  public studentName!: string;
  public departmentCode!: string;
  public semester!: number;
  public status!: 'AVAILABLE' | 'CLAIMED';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UsnRegistry.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usn: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    studentName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    departmentCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.ENUM('AVAILABLE', 'CLAIMED'),
      allowNull: false,
      defaultValue: 'AVAILABLE',
    },
  },
  {
    sequelize: db,
    tableName: 'usn_registries',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['usn'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['departmentCode'],
      },
    ],
  }
);

export default UsnRegistry;
