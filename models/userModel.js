const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name is required'], trim: true, maxlength: 60 },
  lastName: { type: String, required: [true, 'Last name is required'], trim: true, maxlength: 60 },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Enter a valid email address']
  },
  role: { type: String, enum: ['patient', 'caregiver', 'sme'], required: true },
  photo: { type: String, default: null },
  password: { type: String, required: true, select: false, minlength: 8 },
  passwordConfirm: {
    type: String,
    select: false,
    required: [function () { return this.isModified('password'); }, 'Confirm your password'],
    validate: {
      validator: function (value) { return value === this.password; },
      message: 'Passwords do not match.'
    }
  }
}, { timestamps: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('findOneAndUpdate', async function hashUpdatedPassword() {
  const update = this.getUpdate();
  const fields = update.$set || update;
  if (!Object.prototype.hasOwnProperty.call(fields, 'password') &&
      !Object.prototype.hasOwnProperty.call(fields, 'passwordConfirm')) return;
  if (typeof fields.password !== 'string' || fields.password.length < 8 ||
      fields.password !== fields.passwordConfirm) {
    throw new Error('Password must have at least 8 characters and match passwordConfirm.');
  }
  fields.password = await bcrypt.hash(fields.password, 12);
  delete fields.passwordConfirm;
});

userSchema.methods.verifyPassword = function verifyPassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
