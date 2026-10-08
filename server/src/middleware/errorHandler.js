export function errorHandler(error, _request, response, next) {
  if (response.headersSent) return next(error);

  if (error?.code === 'LIMIT_FILE_SIZE') {
    const message = error.field === 'productVideo'
      ? 'Video exceeds the 1 GB upload limit. Videos over 15 MB are automatically compressed to 15 MB or less.'
      : 'The uploaded file exceeds its allowed size limit.';
    return response.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message,
      },
    });
  }

  const statusCode = error.statusCode || error.status || 500;
  const isMalformedJson = error.type === 'entity.parse.failed';

  if (statusCode === 500) {
    console.error('[API Internal Server Error]:', error);
  }

  const message = isMalformedJson
    ? 'Malformed JSON request body.'
    : statusCode === 500
      ? 'Something went wrong. Please try again.'
      : (error.message || 'Request failed.');

  const code = error.code || (isMalformedJson
    ? 'INVALID_JSON'
    : statusCode === 500
      ? 'INTERNAL_SERVER_ERROR'
      : 'REQUEST_ERROR');

  response.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}