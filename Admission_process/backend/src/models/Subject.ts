import { DataTypes, Model } from 'sequelize';
import db from '../config/database';

class Subject extends Model {
  public id!: string;
  public name!: string;
  public code!: string;
  public semester!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Subject.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize: db,
    tableName: 'subjects',
    timestamps: true,
    indexes: [
      {
        fields: ['code'],
      },
      {
        fields: ['semester'],
      },
    ],
  }
);

export default Subject;
