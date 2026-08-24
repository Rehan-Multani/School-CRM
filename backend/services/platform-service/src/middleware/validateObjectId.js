import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';

// Rejects malformed ids with a clean 400 before they reach a repository, instead of letting
// Mongoose throw an uncaught CastError (a 500, and — outside production — leaks the raw
// driver error message back to the client).
export function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return next(new AppError(`Invalid ${paramName}`, 400));
    }
    next();
  };
}
