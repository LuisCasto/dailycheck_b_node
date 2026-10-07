// HW05: corepack pnpm test:hw05 | All homework: corepack pnpm test
// Checks: corepack pnpm typecheck | corepack pnpm build
import { describe, expect, it, jest } from "@jest/globals";
import type { Habit, HabitLog, User } from "@prisma/client";
import { createHabit, signup, toggleHabitLog, type HabitDependencies, type LogDependencies, type SignupDependencies } from "../../src/services.js";

const userId = "11111111-1111-4111-8111-111111111111";
const habitId = "22222222-2222-4222-8222-222222222222";
const user: User = { id: userId, name: "Axel", email: "axel@example.com", hashedPassword: "hashed-password", createdAt: new Date("2026-01-01T00:00:00Z") };
const habit: Habit = { id: habitId, userId, name: "Drink water", description: "", category: "Otro", icon: "🎯", dailyTask: "Drink two litres", targetValue: null, unit: null, frequency: "daily", timesPerPeriod: 1, createdAt: user.createdAt };
const log: HabitLog = { id: "33333333-3333-4333-8333-333333333333", habitId, userId, date: new Date("2026-10-03T00:00:00Z"), completed: true, note: "Done", loggedAt: user.createdAt };

function signupMocks() {
  return {
    findByEmail: jest.fn<SignupDependencies["findByEmail"]>().mockResolvedValue(null),
    hashPassword: jest.fn<SignupDependencies["hashPassword"]>().mockResolvedValue("hashed-password"),
    createUser: jest.fn<SignupDependencies["createUser"]>().mockResolvedValue(user),
  };
}

function logMocks() {
  return {
    findOwnedHabit: jest.fn<LogDependencies["findOwnedHabit"]>().mockResolvedValue(habit),
    findLog: jest.fn<LogDependencies["findLog"]>().mockResolvedValue(null),
    createLog: jest.fn<LogDependencies["createLog"]>().mockResolvedValue(log),
    deleteLog: jest.fn<LogDependencies["deleteLog"]>().mockResolvedValue(undefined),
  };
}

describe("HW05: DailyCheck isolated service units (AAA)", () => {
  it("UT-01: signs up a new user without exposing the password hash", async () => {
    // Arrange
    const deps = signupMocks();
    const input = { name: "Axel", email: "axel@example.com", password: "Password123" };
    // Act
    const result = await signup(input, deps);
    // Assert
    expect(deps.findByEmail).toHaveBeenCalledWith(input.email);
    expect(deps.hashPassword).toHaveBeenCalledWith(input.password);
    expect(deps.createUser).toHaveBeenCalledWith({ name: input.name, email: input.email, hashedPassword: "hashed-password" });
    expect(result).toEqual({ id: userId, name: input.name, email: input.email, created_at: user.createdAt });
    expect(result).not.toHaveProperty("hashedPassword");
    expect(result).not.toHaveProperty("password");
  });

  it("UT-02: rejects signup when the email already exists", async () => {
    // Arrange
    const deps = signupMocks();
    deps.findByEmail.mockResolvedValue(user);
    const input = { name: "Axel", email: user.email, password: "Password123" };
    // Act
    const result = signup(input, deps);
    // Assert
    await expect(result).rejects.toMatchObject({ statusCode: 400, message: "Email ya registrado" });
    expect(deps.hashPassword).not.toHaveBeenCalled();
    expect(deps.createUser).not.toHaveBeenCalled();
  });

  it("UT-03: creates a habit for the supplied user with defaults", async () => {
    // Arrange
    const deps = { createHabit: jest.fn<HabitDependencies["createHabit"]>().mockResolvedValue(habit) };
    const input = { name: "Drink water", daily_task: "Drink two litres" };
    // Act
    const result = await createHabit(userId, input, deps);
    // Assert
    expect(deps.createHabit).toHaveBeenCalledWith({ userId, name: input.name, dailyTask: input.daily_task, description: "", category: "Otro", icon: "🎯", targetValue: null, unit: null, frequency: "daily", timesPerPeriod: 1 });
    expect(result).toMatchObject({ id: habitId, user_id: userId, name: input.name, daily_task: input.daily_task, frequency: "daily" });
  });

  it("UT-04: logs completion of an owned habit", async () => {
    // Arrange
    const deps = logMocks();
    const input = { habit_id: habitId, date: "2026-10-03", note: "Done" };
    // Act
    const result = await toggleHabitLog(userId, input, deps);
    // Assert
    expect(deps.findOwnedHabit).toHaveBeenCalledWith(habitId, userId);
    expect(deps.createLog).toHaveBeenCalledWith({ habitId, userId, date: log.date, completed: true, note: "Done" });
    expect(result).toMatchObject({ statusCode: 201, body: { habit_id: habitId, user_id: userId, date: input.date, completed: true, note: "Done" } });
    expect(deps.deleteLog).not.toHaveBeenCalled();
  });

  it("UT-05: rejects logging another user's habit", async () => {
    // Arrange
    const deps = logMocks();
    deps.findOwnedHabit.mockResolvedValue(null);
    // Act
    const result = toggleHabitLog(userId, { habit_id: habitId, date: "2026-10-03" }, deps);
    // Assert
    await expect(result).rejects.toMatchObject({ statusCode: 404, message: "Habito no encontrado" });
    expect(deps.findLog).not.toHaveBeenCalled();
    expect(deps.createLog).not.toHaveBeenCalled();
    expect(deps.deleteLog).not.toHaveBeenCalled();
  });

  it("UT-06: toggles an existing log off instead of duplicating it", async () => {
    // Arrange
    const deps = logMocks();
    deps.findLog.mockResolvedValue(log);
    // Act
    const result = await toggleHabitLog(userId, { habit_id: habitId, date: "2026-10-03" }, deps);
    // Assert
    expect(deps.deleteLog).toHaveBeenCalledWith(log.id);
    expect(deps.createLog).not.toHaveBeenCalled();
    expect(result).toMatchObject({ statusCode: 200, body: { deleted: true, log_id: log.id } });
  });
});
