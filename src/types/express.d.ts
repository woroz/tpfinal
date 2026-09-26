import { JwtUser } from "./jwt.ts";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

export {};
