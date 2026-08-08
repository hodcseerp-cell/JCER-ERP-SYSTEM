import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters.',
    'any.required': 'Password is required.',
  }),
});

export const registerSchema = Joi.object({
  firstName: Joi.string().max(50).required().messages({
    'any.required': 'First name is required.',
  }),
  lastName: Joi.string().max(50).required().messages({
    'any.required': 'Last name is required.',
  }),
  email: Joi.string().email().max(100).required().messages({
    'string.email': 'Please enter a valid email address.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().min(8).max(100).required().messages({
    'string.min': 'Password must be at least 8 characters.',
    'any.required': 'Password is required.',
  }),
  phone: Joi.string().pattern(/^\+?[0-9\s-]{8,15}$/).optional().allow('', null).messages({
    'string.pattern.base': 'Please enter a valid phone number.',
  }),
});

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    'any.required': 'Old password is required.',
  }),
  newPassword: Joi.string().min(8).max(100).required().invalid(Joi.ref('oldPassword')).messages({
    'string.min': 'New password must be at least 8 characters.',
    'any.required': 'New password is required.',
    'any.invalid': 'New password cannot be the same as old password.',
  }),
});
