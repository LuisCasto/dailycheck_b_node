import type { Habit, HabitLog, User } from "@prisma/client";
import type { z } from "zod";
import { HttpError } from "./errors.js";
import { habitCreateSchema, logCreateSchema, toDate, userCreateSchema, userLoginSchema } from "./schemas.js";
import { habitOut, logOut, userOut } from "./serializers.js";

export interface SignupDependencies {
  findByEmail(email: string): Promise<User | null>;
  hashPassword(password: string): Promise<string>;
  createUser(data: { name: string; email: string; hashedPassword: string }): Promise<User>;
}

export async function signup(input: z.input<typeof userCreateSchema>, deps: SignupDependencies) {
  const data = userCreateSchema.parse(input);
  if (await deps.findByEmail(data.email)) throw new HttpError(400, "Email ya registrado");
  const hashedPassword = await deps.hashPassword(data.password);
  return userOut(await deps.createUser({ name: data.name, email: data.email, hashedPassword }));
}

export interface LoginDependencies {
  findByEmail(email: string): Promise<User | null>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  createToken(userId: string): Promise<string>;
}

export async function login(input: z.input<typeof userLoginSchema>, deps: LoginDependencies) {
  const data = userLoginSchema.parse(input);
  const user = await deps.findByEmail(data.email);
  if (!user || !(await deps.verifyPassword(data.password, user.hashedPassword))) {
    throw new HttpError(401, "Credenciales incorrectas");
  }
  return { access_token: await deps.createToken(user.id), token_type: "bearer" };
}

export interface HabitDependencies {
  createHabit(data: {
    userId: string; name: string; description: string; category: string; icon: string;
    dailyTask: string; targetValue: number | null; unit: string | null;
    frequency: string; timesPerPeriod: number;
  }): Promise<Habit>;
}

export async function createHabit(userId: string, input: z.input<typeof habitCreateSchema>, deps: HabitDependencies) {
  const data = habitCreateSchema.parse(input);
  return habitOut(await deps.createHabit({
    userId, name: data.name, description: data.description, category: data.category,
    icon: data.icon, dailyTask: data.daily_task, targetValue: data.target_value ?? null,
    unit: data.unit ?? null, frequency: data.frequency, timesPerPeriod: data.times_per_period,
  }));
}

export interface LogDependencies {
  findOwnedHabit(habitId: string, userId: string): Promise<Habit | null>;
  findLog(habitId: string, date: Date): Promise<HabitLog | null>;
  createLog(data: { habitId: string; userId: string; date: Date; completed: boolean; note: string | null }): Promise<HabitLog>;
  deleteLog(id: string): Promise<unknown>;
}

export async function toggleHabitLog(userId: string, input: z.input<typeof logCreateSchema>, deps: LogDependencies) {
  const data = logCreateSchema.parse(input);
  if (!(await deps.findOwnedHabit(data.habit_id, userId))) throw new HttpError(404, "Habito no encontrado");
  const date = toDate(data.date);
  const existing = await deps.findLog(data.habit_id, date);
  if (existing) {
    await deps.deleteLog(existing.id);
    return { statusCode: 200, body: { detail: "Log eliminado", deleted: true, log_id: existing.id, habit_id: data.habit_id, date: data.date } };
  }
  const log = await deps.createLog({ habitId: data.habit_id, userId, date, completed: true, note: data.note ?? null });
  return { statusCode: 201, body: logOut(log) };
}
