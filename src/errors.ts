import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(422).send({ detail: error.issues });
    }
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ detail: error.message });
    }
    app.log.error(error);
    return reply.status(500).send({ detail: "Internal server error" });
  });
}
