import type { FastifyInstance, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createAccessToken, getCurrentUser } from "./auth.js";
import { prisma } from "./db.js";
import { HttpError } from "./errors.js";
import {
  formatDate,
  habitCreateSchema,
  habitIdParams,
  habitUpdateSchema,
  logCreateSchema,
  logIdParams,
  logUpdateSchema,
  toDate,
  userCreateSchema,
  userIdParams,
  userLoginSchema,
  userUpdateSchema,
} from "./schemas.js";
import { habitOut, logOut, userOut } from "./serializers.js";
import { signup, login, createHabit, toggleHabitLog } from "./services.js";

async function currentUser(request: FastifyRequest) {
  return getCurrentUser(request);
}

async function ownedHabit(habitId: string, userId: string) {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) throw new HttpError(404, "Habito no encontrado");
  return habit;
}

async function ownedLog(logId: string, userId: string) {
  const log = await prisma.habitLog.findFirst({ where: { id: logId, userId } });
  if (!log) throw new HttpError(404, "Log no encontrado");
  return log;
}

function parseBody<T>(schema: { parse(value: unknown): T }, body: unknown) {
  return schema.parse(body);
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));

  app.post("/api/auth/register", async (request, reply) => {
    const data = parseBody(userCreateSchema, request.body);
    const user = await signup(data, {
      findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
      hashPassword: (password) => bcrypt.hash(password, 12),
      createUser: (data) => prisma.user.create({ data }),
    });
    return reply.code(201).send(user);
  });

  app.get("/api/auth/stats", async () => ({ total_users: await prisma.user.count() }));

  app.post("/api/auth/login", async (request) => {
    const data = parseBody(userLoginSchema, request.body);
    return login(data, {
      findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
      verifyPassword: (password, hash) => bcrypt.compare(password, hash),
      createToken: createAccessToken,
    });
  });

  app.get("/api/auth/me", async (request) => userOut(await currentUser(request)));

  app.get("/api/users/:user_id", async (request) => {
    const { user_id } = userIdParams.parse(request.params);
    const user = await currentUser(request);
    if (user.id !== user_id) throw new HttpError(403, "No tienes acceso a este usuario");
    return userOut(user);
  });

  app.patch("/api/users/:user_id", async (request) => {
    const { user_id } = userIdParams.parse(request.params);
    const user = await currentUser(request);
    if (user.id !== user_id) throw new HttpError(403, "No tienes acceso a este usuario");
    const data = parseBody(userUpdateSchema, request.body);
    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new HttpError(400, "Email ya registrado");
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.name === undefined ? {} : { name: data.name }),
        ...(data.email === undefined ? {} : { email: data.email }),
        ...(data.password ? { hashedPassword: await bcrypt.hash(data.password, 12) } : {}),
      },
    });
    return userOut(updated);
  });

  app.delete("/api/users/:user_id", async (request, reply) => {
    const { user_id } = userIdParams.parse(request.params);
    const user = await currentUser(request);
    if (user.id !== user_id) throw new HttpError(403, "No tienes acceso a este usuario");
    await prisma.user.delete({ where: { id: user.id } });
    return reply.code(204).send();
  });

  app.get("/api/habits", async (request) => {
    const user = await currentUser(request);
    const habits = await prisma.habit.findMany({ where: { userId: user.id } });
    return habits.map(habitOut);
  });

  app.get("/api/habits/:habit_id", async (request) => {
    const { habit_id } = habitIdParams.parse(request.params);
    return habitOut(await ownedHabit(habit_id, (await currentUser(request)).id));
  });

  app.post("/api/habits", async (request, reply) => {
    const user = await currentUser(request);
    const data = parseBody(habitCreateSchema, request.body);
    const habit = await createHabit(user.id, data, {
      createHabit: (data) => prisma.habit.create({ data }),
    });
    return reply.code(201).send(habit);
  });

  app.put("/api/habits/:habit_id", async (request) => {
    const { habit_id } = habitIdParams.parse(request.params);
    const user = await currentUser(request);
    await ownedHabit(habit_id, user.id);
    const data = parseBody(habitUpdateSchema, request.body);
    const habit = await prisma.habit.update({
      where: { id: habit_id },
      data: {
        ...(data.name === undefined ? {} : { name: data.name }),
        ...(data.description === undefined ? {} : { description: data.description }),
        ...(data.category === undefined ? {} : { category: data.category }),
        ...(data.icon === undefined ? {} : { icon: data.icon }),
        ...(data.daily_task === undefined ? {} : { dailyTask: data.daily_task }),
        ...(data.target_value === undefined ? {} : { targetValue: data.target_value }),
        ...(data.unit === undefined ? {} : { unit: data.unit }),
        ...(data.frequency === undefined ? {} : { frequency: data.frequency }),
        ...(data.times_per_period === undefined ? {} : { timesPerPeriod: data.times_per_period }),
      },
    });
    return habitOut(habit);
  });

  app.delete("/api/habits/:habit_id", async (request, reply) => {
    const { habit_id } = habitIdParams.parse(request.params);
    await ownedHabit(habit_id, (await currentUser(request)).id);
    await prisma.habit.delete({ where: { id: habit_id } });
    return reply.code(204).send();
  });

  app.get("/api/logs", async (request) => {
    const user = await currentUser(request);
    const query = request.query as { log_date?: string };
    const logDate = query.log_date ? toDate(query.log_date) : undefined;
    const logs = await prisma.habitLog.findMany({
      where: { userId: user.id, ...(logDate ? { date: logDate } : {}) },
    });
    return logs.map(logOut);
  });

  async function toggleLog(request: FastifyRequest, reply: { code: (status: number) => { send: (body?: unknown) => unknown } }) {
    const user = await currentUser(request);
    const data = parseBody(logCreateSchema, request.body);
    try {
      const result = await toggleHabitLog(user.id, data, {
        findOwnedHabit: (id, userId) => prisma.habit.findFirst({ where: { id, userId } }),
        findLog: (habitId, date) => prisma.habitLog.findUnique({ where: { uq_habit_log_per_day: { habitId, date } } }),
        createLog: (data) => prisma.habitLog.create({ data }),
        deleteLog: (id) => prisma.habitLog.delete({ where: { id } }),
      });
      return reply.code(result.statusCode).send(result.body);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(400, "Ya existe un log para este habito en esa fecha");
      }
      throw error;
    }
  }

  app.post("/api/logs", toggleLog);
  app.post("/api/logs/toggle", toggleLog);

  app.get("/api/logs/stats/:habit_id", async (request) => {
    const { habit_id } = habitIdParams.parse(request.params);
    const user = await currentUser(request);
    await ownedHabit(habit_id, user.id);
    const today = new Date(`${formatDate(new Date())}T00:00:00.000Z`);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    const completedWhere = { habitId: habit_id, userId: user.id, completed: true };
    const [total, completed30d, recent] = await Promise.all([
      prisma.habitLog.count({ where: completedWhere }),
      prisma.habitLog.count({ where: { ...completedWhere, date: { gte: thirtyDaysAgo, lte: today } } }),
      prisma.habitLog.findMany({ where: { ...completedWhere, date: { gte: new Date(today.getTime() - 365 * 86400000), lte: today } }, select: { date: true } }),
    ]);
    const dates = new Set(recent.map((log) => formatDate(log.date)));
    let streak = 0;
    for (let index = 0; index < 365; index += 1) {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() - index);
      if (!dates.has(formatDate(day))) {
        if (index > 0) break;
        continue;
      }
      streak += 1;
    }
    return { habit_id, streak, completion_rate_30d: Math.round((completed30d / 30) * 100), total_logs: total };
  });

  app.get("/api/logs/:log_id", async (request) => {
    const { log_id } = logIdParams.parse(request.params);
    return logOut(await ownedLog(log_id, (await currentUser(request)).id));
  });

  app.patch("/api/logs/:log_id", async (request) => {
    const { log_id } = logIdParams.parse(request.params);
    const user = await currentUser(request);
    await ownedLog(log_id, user.id);
    const data = parseBody(logUpdateSchema, request.body);
    try {
      const log = await prisma.habitLog.update({
        where: { id: log_id },
        data: {
          ...(data.date === undefined ? {} : { date: toDate(data.date) }),
          ...(data.completed === undefined ? {} : { completed: data.completed }),
          ...(data.note === undefined ? {} : { note: data.note }),
        },
      });
      return logOut(log);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(400, "Ya existe un log para este habito en esa fecha");
      }
      throw error;
    }
  });

  app.delete("/api/logs/:log_id", async (request, reply) => {
    const { log_id } = logIdParams.parse(request.params);
    await ownedLog(log_id, (await currentUser(request)).id);
    await prisma.habitLog.delete({ where: { id: log_id } });
    return reply.code(204).send();
  });
}
