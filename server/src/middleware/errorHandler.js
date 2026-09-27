export function errorHandler(error, _request, response, next) {
  if (response.headersSent) return next(error);

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