const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user.model');

// One Gmail connection per user. Tokens are stored ENCRYPTED (AES-256-GCM via
// crypto.util) - the columns hold ciphertext, never plaintext tokens. A unique
// index on user_id enforces the one-connection-per-user rule at the DB level.
class GmailConnection extends Model {}

GmailConnection.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    // The connected Gmail address, stored plainly for display ("Connected as
    // x@gmail.com"). Not a secret.
    email_address: { type: DataTypes.STRING(255), allowNull: true },
    // Encrypted OAuth tokens.
    access_token_enc: { type: DataTypes.TEXT, allowNull: false },
    refresh_token_enc: { type: DataTypes.TEXT, allowNull: true },
    token_expiry: { type: DataTypes.DATE, allowNull: true },
    connected_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'GmailConnection',
    tableName: 'gmail_connections',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ unique: true, fields: ['user_id'] }],
  }
);

User.hasOne(GmailConnection, { foreignKey: 'user_id', onDelete: 'CASCADE' });
GmailConnection.belongsTo(User, { foreignKey: 'user_id' });

module.exports = GmailConnection;
