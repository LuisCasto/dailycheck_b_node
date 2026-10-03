import { z } from "zod";

const uuid = z.string().uuid();
const date = z.string().date();
const email = z.string().email();

export const userCreateSchema = z.object({ name: z.string().min(1), email, password: z.string().min(6) });
export const userLoginSchema = z.object({ email, password: z.string().min(1) });
export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: email.optional(),
  password: z.string().min(6).optional(),
});

export const habitCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  category: z.string().default("Otro"),
  icon: z.string().default("🎯"),
  daily_task: z.string().min(1),
  target_value: z.number().int().nullable().optional(),
  unit: z.string().nullable().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  times_per_period: z.number().int().default(1),
});
export const habitUpdateSchema = habitCreateSchema.partial();

export const logCreateSchema = z.object({ habit_id: uuid, date, note: z.string().nullable().optional() });
export const logUpdateSchema = z.object({ date: date.optional(), completed: z.boolean().optional(), note: z.string().nullable().optional() });

export const userIdParams = z.object({ user_id: uuid });
export const habitIdParams = z.object({ habit_id: uuid });
export const logIdParams = z.object({ log_id: uuid });

export function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
