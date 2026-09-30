import Joi from 'joi';

export const validationSchema = Joi.object({
  // Server
  PORT: Joi.number().default(5000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Database
  MONGODB_URI: Joi.string().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
});
