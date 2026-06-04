const Joi = require('joi');

const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().min(6).required(),
    organizationId: Joi.string().uuid().required()
  }),
  
  register: Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).max(100).required(),
    organizationId: Joi.string().uuid().required(),
    role: Joi.string().valid('admin', 'agent').default('agent')
  })
};

const contactSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(), // Validates E.164 phone formats
    email: Joi.string().email().allow(null, '').trim(),
    company: Joi.string().max(100).allow(null, ''),
    notes: Joi.string().max(1000).allow(null, ''),
    pipelineStageId: Joi.string().uuid().allow(null, ''),
    assignedUserId: Joi.string().uuid().allow(null, '')
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(150),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    email: Joi.string().email().allow(null, '').trim(),
    company: Joi.string().max(100).allow(null, ''),
    notes: Joi.string().max(1000).allow(null, ''),
    pipelineStageId: Joi.string().uuid().allow(null, ''),
    assignedUserId: Joi.string().uuid().allow(null, '')
  })
};

const messageSchemas = {
  send: Joi.object({
    body: Joi.string().min(1).max(4096).required(),
    messageType: Joi.string().valid('text', 'image', 'audio', 'video', 'document', 'template').default('text'),
    isInternal: Joi.boolean().default(false)
  })
};

const settingsSchemas = {
  upsert: Joi.object({
    key: Joi.string().min(2).max(255).required(),
    value: Joi.any().required()
  })
};

module.exports = {
  authSchemas,
  contactSchemas,
  messageSchemas,
  settingsSchemas
};
