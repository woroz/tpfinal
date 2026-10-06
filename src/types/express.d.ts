import { JwtUser } from "./jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

export {};
