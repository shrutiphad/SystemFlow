const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user.model');

// Deliberately a sibling of Task, not an extension of it. A job application
// and a task are different domain objects with different lifecycles - forcing
// them into one table (e.g. a `type` column) would blur two concerns and make
// every query filter on type forever. Separate table, same ownership pattern.
class JobApplication extends Model {}

JobApplication.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    company_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 150] },
    },
    role_title: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    portal: {
      // Where the application was submitted - LinkedIn, Naukri, referral, etc.
      // Free-text STRING rather than ENUM: the set of job portals is open-ended
      // and changes often, so an ENUM would need a migration every time a new
      // portal appears. This is the exact trade-off inverse of Task.priority,
      // where the value set is small and fixed - worth being able to explain.
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    status: {
      // The Kanban columns. Fixed, small, and central to the UI's structure,
      // so ENUM is the right call here (unlike `portal` above).
      type: DataTypes.ENUM('wishlist', 'applied', 'oa', 'interviewing', 'offer', 'rejected', 'withdrawn'),
      allowNull: false,
      defaultValue: 'wishlist',
    },
    job_url: {
      // The posting URL (LinkedIn/portal/company site). Free-text STRING, not
      // validated as a URL at the model layer - the route layer normalises and
      // validates; here we only cap length.
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    salary_range: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    source: {
      // Normalised capture bucket for analytics, unlike `portal` above which
      // stays free-text. Small fixed set, but STRING + isIn rather than ENUM so
      // adding a bucket later is a value change, not a pg enum migration.
      type: DataTypes.STRING(60),
      allowNull: true,
      validate: {
        isIn: [['linkedin', 'naukri', 'company_site', 'referral', 'other']],
      },
    },
    excitement: {
      // 1-5 self-rating for prioritisation.
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 5 },
    },
    outreach_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    applied_date: { type: DataTypes.DATEONLY, allowNull: true },
    next_follow_up: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    modelName: 'JobApplication',
    tableName: 'job_applications',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['next_follow_up'] },
      // Most common query: "my applications, grouped/filtered by status" for
      // the Kanban board - user_id leads, same reasoning as the Task indexes.
      { fields: ['user_id', 'status'] },
    ],
  }
);

User.hasMany(JobApplication, { foreignKey: 'user_id', onDelete: 'CASCADE' });
JobApplication.belongsTo(User, { foreignKey: 'user_id' });

module.exports = JobApplication;
