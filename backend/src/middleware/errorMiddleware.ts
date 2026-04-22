import { NextFunction, Request, Response } from "express";
import { HttpError } from "http-errors";

export const errorMiddleware = (
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({
    success: false,
    message
  });
};
