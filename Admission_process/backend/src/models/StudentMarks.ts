import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Assessment from './Assessment';
import AssessmentComponent from './AssessmentComponent';
import Student from './Student';

class StudentMarks extends Model {
  public id!: string;
  public assessmentId!: string;
  public componentId!: string;
  public studentId!: string;
  public marks!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StudentMarks.init(
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
    },
    componentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'assessment_components',
        key: 'id',
      },
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id',
      },
    },
    marks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
  },
  {
    sequelize: db,
    tableName: 'student_marks',
    timestamps: true,
    indexes: [
      { fields: ['assessmentId'] },
      { fields: ['componentId'] },
      { fields: ['studentId'] },
      { fields: ['studentId', 'assessmentId', 'componentId'], unique: true },
    ],
  }
);

StudentMarks.belongsTo(Assessment, { as: 'assessment', foreignKey: 'assessmentId' });
StudentMarks.belongsTo(AssessmentComponent, { as: 'component', foreignKey: 'componentId' });
StudentMarks.belongsTo(Student, { as: 'student', foreignKey: 'studentId' });

export default StudentMarks;
