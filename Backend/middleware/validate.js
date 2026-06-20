const validateRequest = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error) {
    console.error('Validation Error:', error);
    if (error.name === 'ZodError') {
      const errList = error.issues || error.errors || [];
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: errList.map(err => ({ path: err.path ? err.path.join('.') : 'unknown', message: err.message }))
      });
    }
    return res.status(400).json({ success: false, message: 'Bad Request', error: error.message });
  }
};

module.exports = validateRequest;
