import Joi from 'joi';

export const payFeeSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Payment amount must be greater than zero.',
    'any.required': 'Payment amount is required.',
  }),
  paymentMethod: Joi.string().valid('CARD', 'UPI', 'NET_BANKING', 'CASH').required().messages({
    'any.only': 'Payment method must be one of: CARD, UPI, NET_BANKING, CASH.',
    'any.required': 'Payment method is required.',
  }),
  transactionReference: Joi.string().min(5).max(100).required().messages({
    'string.min': 'Transaction reference must be at least 5 characters.',
    'any.required': 'Transaction reference is required.',
  }),
});
