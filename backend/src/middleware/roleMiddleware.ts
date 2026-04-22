import { Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { forbidden, unauthorized } from "../utils/http";

export const roleMiddleware = (allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(unauthorized());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(forbidden("You do not have access to this resource"));
    }

    return next();
  };
};
