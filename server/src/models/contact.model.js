const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user.model');
const JobApplication = require('./jobApplication.model');

// A person in the user's job-hunt network: recruiter, referrer, hiring manager,
// alumnus, etc. Same ownership pattern as Task/JobApplication (every row scoped
// by user_id). A contact may OPTIONALLY be linked to one job application via
// job_id - e.g. "this recruiter is for the Stripe role" - which is the exact
// child-record case in CLAUDE.md: the controller must verify the parent job
// belongs to the same user before attaching.
class Contact extends Model {}

Contact.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 120] },
    },
    role_title: { type: DataTypes.STRING(150), allowNull: true },
    company_name: { type: DataTypes.STRING(150), allowNull: true },
    email: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: { isEmailOrEmpty(v) { if (v && !/^\S+@\S+\.\S+$/.test(v)) throw new Error('Invalid email'); } },
    },
    phone: { type: DataTypes.STRING(40), allowNull: true },
    linkedin_url: { type: DataTypes.STRING(500), allowNull: true },
    relationship: {
      // Free-ish set that may grow (alumni, mentor, ...), so STRING + isIn
      // rather than a pg ENUM - the same trade-off as JobApplication.source.
      type: DataTypes.STRING(40),
      allowNull: true,
      validate: {
        isIn: [['recruiter', 'referral', 'hiring_manager', 'colleague', 'alumni', 'mentor', 'other']],
      },
    },
    status: {
      // The outreach pipeline. Small, fixed, and central to the UI's badges,
      // so ENUM is right here (like JobApplication.status).
      type: DataTypes.ENUM('to_contact', 'contacted', 'responded', 'referred', 'closed'),
      allowNull: false,
      defaultValue: 'to_contact',
    },
    last_contacted: { type: DataTypes.DATEONLY, allowNull: true },
    next_follow_up: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    job_id: {
      // Optional link to a job application. SET NULL (not CASCADE) on purpose:
      // a contact is a person and should outlive the deletion of one job app -
      // deleting the Stripe application shouldn't erase the recruiter.
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: JobApplication, key: 'id' },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    modelName: 'Contact',
    tableName: 'contacts',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['next_follow_up'] },
      { fields: ['user_id', 'status'] },
    ],
  }
);

User.hasMany(Contact, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Contact.belongsTo(User, { foreignKey: 'user_id' });
// A job can have many contacts; a contact belongs to at most one job.
JobApplication.hasMany(Contact, { foreignKey: 'job_id', onDelete: 'SET NULL' });
Contact.belongsTo(JobApplication, { foreignKey: 'job_id', as: 'job' });

module.exports = Contact;
