import type { FastifyRequest } from "fastify";
import { jwtVerify, SignJWT } from "jose";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { HttpError } from "./errors.js";

const secret = new TextEncoder().encode(config.SECRET_KEY);

export async function createAccessToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: config.ALGORITHM, typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${config.ACCESS_TOKEN_EXPIRE_MINUTES}m`)
    .sign(secret);
}

export async function getCurrentUser(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Not authenticated");
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), secret, {
      algorithms: [config.ALGORITHM],
    });
    if (typeof payload.sub !== "string") throw new Error("Missing subject");
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new Error("User not found");
    return user;
  } catch {
    throw new HttpError(401, "Token invalido o expirado");
  }
}
