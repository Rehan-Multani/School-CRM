export class AppError extends Error {
  /**
   * @param {string} message  Human-readable, safe-to-return error message.
   * @param {number} [statusCode=400]
   * @param {string} [code]  Optional stable machine-readable code (e.g. 'TEACHER_INACTIVE').
   *                          errorHandler.js already surfaces `err.code` in the JSON body;
   *                          when omitted it derives one from the status code (back-compat).
   */
  constructor(message, statusCode = 400, code = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    if (code) this.code = code;
  }
}
