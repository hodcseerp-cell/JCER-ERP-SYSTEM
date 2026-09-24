import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Assessment from './Assessment';

class AssessmentComponent extends Model {
  public id!: string;
  public assessmentId!: string;
  public name!: string;
  public componentType!: 'BIT' | 'THEORY' | 'PRACTICAL' | 'ASSIGNMENT';
  public maxMarks!: number;
  public sequence!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AssessmentComponent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    assessmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'assessments',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    componentType: {
      type: DataTypes.ENUM('BIT', 'THEORY', 'PRACTICAL', 'ASSIGNMENT'),
      allowNull: false,
      defaultValue: 'BIT',
    },
    maxMarks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10.0,
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize: db,
    tableName: 'assessment_components',
    timestamps: true,
    indexes: [
      { fields: ['assessmentId'] },
      { fields: ['sequence'] },
    ],
  }
);

AssessmentComponent.belongsTo(Assessment, { as: 'assessment', foreignKey: 'assessmentId' });
Assessment.hasMany(AssessmentComponent, { as: 'components', foreignKey: 'assessmentId' });

export default AssessmentComponent;
