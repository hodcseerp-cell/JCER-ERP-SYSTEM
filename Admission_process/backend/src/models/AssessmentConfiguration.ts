import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Department from './Department';
import Subject from './Subject';
import User from './User';

export interface SubQuestionDef {
  id: string; // e.g. 'q1_a'
  label: string; // e.g. 'a' or '1(a)'
  maxMarks: number;
  isOptional?: boolean;
}

export interface MainQuestionDef {
  id: string; // e.g. 'q1'
  questionNumber: number; // e.g. 1
  label: string; // e.g. 'Q1'
  maxMarks: number; // Sum of subquestions or explicitly specified
  subquestions: SubQuestionDef[];
}

export interface QuestionGroupRule {
  id: string; // e.g. 'g1'
  name: string; // e.g. 'Group 1 (Q1 OR Q2)'
  questionIds: string[]; // e.g. ['q1', 'q2']
  chooseType: 'BEST_OF_1' | 'BEST_OF_N' | 'COMPULSORY';
  maxMarks: number; // e.g. 25
}

export interface AttemptRulesDef {
  type: 'GROUPED_BEST_OF' | 'COMPULSORY_ALL';
  groups?: QuestionGroupRule[];
}

class AssessmentConfiguration extends Model {
  public id!: string;
  public departmentId!: string;
  public semester!: number;
  public academicYear!: string;
  public subjectId!: string;
  public assessmentType!: 'CIE1' | 'CIE2';
  public configurationVersion!: number;
  public maximumMarks!: number;
  public questionPattern!: MainQuestionDef[];
  public attemptRules!: AttemptRulesDef;
  public status!: 'DRAFT' | 'CONFIGURED' | 'SAVED' | 'FINALIZED';
  public createdBy!: string | null;
  public updatedBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public department?: Department;
  public subject?: Subject;
  public creator?: User;
  public updater?: User;
}

AssessmentConfiguration.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    academicYear: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '2026-27',
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    assessmentType: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    configurationVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    maximumMarks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 50.0,
    },
    questionPattern: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    attemptRules: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { type: 'COMPULSORY_ALL' },
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize: db,
    tableName: 'assessment_configurations',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['academicYear', 'departmentId', 'semester', 'subjectId', 'assessmentType'],
        name: 'uq_assessment_config_context',
      },
      { fields: ['subjectId'] },
      { fields: ['departmentId'] },
      { fields: ['academicYear'] },
    ],
  }
);

AssessmentConfiguration.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
AssessmentConfiguration.belongsTo(Subject, { as: 'subject', foreignKey: 'subjectId' });
AssessmentConfiguration.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
AssessmentConfiguration.belongsTo(User, { as: 'updater', foreignKey: 'updatedBy' });

export default AssessmentConfiguration;
