import type { Habit, HabitLog, User } from "@prisma/client";

export function userOut(user: User) {
  return { id: user.id, name: user.name, email: user.email, created_at: user.createdAt };
}

export function habitOut(habit: Habit) {
  return {
    id: habit.id,
    user_id: habit.userId,
    name: habit.name,
    description: habit.description ?? "",
    category: habit.category ?? "Otro",
    icon: habit.icon ?? "🎯",
    daily_task: habit.dailyTask,
    target_value: habit.targetValue,
    unit: habit.unit,
    frequency: habit.frequency ?? "daily",
    times_per_period: habit.timesPerPeriod ?? 1,
    created_at: habit.createdAt,
  };
}

export function logOut(log: HabitLog) {
  return {
    id: log.id,
    habit_id: log.habitId,
    user_id: log.userId,
    date: log.date.toISOString().slice(0, 10),
    completed: log.completed ?? true,
    note: log.note,
    logged_at: log.loggedAt,
  };
}
