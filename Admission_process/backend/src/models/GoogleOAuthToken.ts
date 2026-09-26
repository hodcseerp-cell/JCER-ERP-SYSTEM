import { DataTypes, Model } from 'sequelize';
import db from '../config/database';
import Department from './Department';
import User from './User';

class GoogleOAuthToken extends Model {
  public id!: string;
  public userId!: string;
  public departmentId!: string | null;
  public googleAccountId!: string | null;
  public displayName!: string | null;
  public profilePicture!: string | null;
  public googleAccountEmail!: string;
  public userEmail!: string;
  public encryptedAccessToken!: string | null;
  public encryptedRefreshToken!: string | null;
  public tokenExpiry!: Date | null;
  public scope!: string | null;
  public status!: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  public connectedBy!: string;
  public lastUsedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GoogleOAuthToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    googleAccountId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    displayName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    profilePicture: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    googleAccountEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    userEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    encryptedAccessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    encryptedRefreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'REVOKED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    connectedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: 'google_oauth_tokens',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['connectedBy'] },
      { fields: ['departmentId'] },
      { fields: ['userEmail'] },
      { fields: ['googleAccountEmail'] },
      { fields: ['googleAccountId'] },
      { fields: ['status'] },
    ],
  }
);

GoogleOAuthToken.belongsTo(User, { as: 'user', foreignKey: 'userId' });
GoogleOAuthToken.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
GoogleOAuthToken.belongsTo(User, { as: 'connectedByUser', foreignKey: 'connectedBy' });

export default GoogleOAuthToken;
