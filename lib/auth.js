
import jwt from "jsonwebtoken";

export function verifyAuth(request) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export function hasRole(user, allowedRoles) {
  return Boolean(user && allowedRoles.includes(user.role));
}
