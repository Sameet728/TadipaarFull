const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.message);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max 10 MB.' });
  }
  if (err.message && err.message.includes('Only JPEG')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate entry.' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Payload too large.' });
  }
  if (req.timedout || err.code === 'ETIMEDOUT') {
    return res.status(408).json({ success: false, message: 'Request timeout. Please try again.' });
  }

  // Handle Operational AppErrors gracefully
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
};

module.exports = errorHandler;
