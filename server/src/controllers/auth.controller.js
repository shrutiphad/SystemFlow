const { User } = require('../models');
const { signToken } = require('../utils/jwt.util');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (existing) return res.status(409).json({ message: 'An account with this email already exists' });

  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password_hash });
  const token = signToken(user);
  res.status(201).json({ token, user: user.toSafeJSON() });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

  const token = signToken(user);
  res.status(200).json({ token, user: user.toSafeJSON() });
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user.toSafeJSON() });
});

const logout = asyncHandler(async (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = { register, login, me, logout };
