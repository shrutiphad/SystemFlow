const sequelize = require('../config/database');
const User = require('./user.model');
const Task = require('./task.model');
const JobApplication = require('./jobApplication.model');
const GmailConnection = require('./gmailConnection.model');
module.exports = { sequelize, User, Task, JobApplication, GmailConnection };
