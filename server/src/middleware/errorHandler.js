export function errorHandler(error, _request, response, next) {
  if (response.headersSent) return next(error);

  if (error?.code === 'LIMIT_FILE_SIZE') {
    return response.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Uploaded file is too large. Images can be up to 10MB and videos up to 25MB.',
      },
    });
  }

  const statusCode = error.statusCode || error.status || 500;
  const isMalformedJson = error.type === 'entity.parse.failed';
  const message = isMalformedJson
    ? 'Malformed JSON request body'
    : statusCode === 500 ? 'Internal server error' : error.message;

  response.status(statusCode).json({
    success: false,
    error: {
      code: error.code || (isMalformedJson
        ? 'INVALID_JSON'
        : statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message,
    },
  });
}