/**
 * Express middleware to validate request payloads against a Joi schema
 * @param {Object} schema - Joi schema definition
 * @param {string} source - Request object key: 'body' | 'query' | 'params'
 */
function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false, // Return all validation errors, not just the first one
      stripUnknown: true, // Remove unknown fields to ensure clean payloads
    });

    if (error) {
      const details = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return res.status(400).json({ error: 'Errores de validación de datos', details });
    }

    // Replace request payload with sanitized, type-cast values
    req[source] = value;
    next();
  };
}

module.exports = {
  validateRequest,
};
