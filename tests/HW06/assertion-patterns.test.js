// HW06: corepack pnpm test:hw06 | All homework: corepack pnpm test
// Checks: corepack pnpm typecheck | corepack pnpm build
import { describe, expect, it, jest } from "@jest/globals";
import { signup, login, createHabit, toggleHabitLog } from "../../.jest-build/src/services.js";

const userId = "11111111-1111-4111-8111-111111111111";
const habitId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00Z");
const user = { id: userId, name: "Axel", email: "axel@example.com", hashedPassword: "stored-hash", createdAt };
const habit = { id: habitId, userId, name: "Drink water", dailyTask: "Drink two litres", description: "", category: "Otro", icon: "🎯", targetValue: null, unit: null, frequency: "daily", timesPerPeriod: 1, createdAt };

function signupMocks() {
  return { findByEmail: jest.fn().mockResolvedValue(null), hashPassword: jest.fn().mockResolvedValue("stored-hash"), createUser: jest.fn().mockResolvedValue(user) };
}
function loginMocks() {
  return { findByEmail: jest.fn().mockResolvedValue(user), verifyPassword: jest.fn().mockResolvedValue(true), createToken: jest.fn().mockResolvedValue("test-access-token") };
}
function logMocks() {
  return {
    findOwnedHabit: jest.fn().mockResolvedValue(habit), findLog: jest.fn().mockResolvedValue(null),
    createLog: jest.fn().mockImplementation(async (data) => ({ ...data, id: "log-id", loggedAt: createdAt })),
    deleteLog: jest.fn().mockResolvedValue(undefined),
  };
}

describe("HW06: JavaScript AAA and six Jest assertion patterns", () => {
  it("JS-01: structural equivalence and value equality on successful signup", async () => {
    // Arrange
    const deps = signupMocks();
    const input = { name: user.name, email: user.email, password: "Password123" };
    const expected = { id: userId, name: user.name, email: user.email, created_at: createdAt };
    // Act
    const actual = await signup(input, deps);
    // Assert
    expect(actual).toStrictEqual(expected);
    expect(actual.email).toBe(input.email);
    expect(actual).not.toHaveProperty("hashedPassword");
  });

  it("JS-02: behavioral/mock interactions save the hash, never the plain password", async () => {
    // Arrange
    const deps = signupMocks();
    const input = { name: user.name, email: user.email, password: "Password123" };
    // Act
    await signup(input, deps);
    // Assert
    expect(deps.hashPassword).toHaveBeenCalledTimes(1);
    expect(deps.hashPassword).toHaveBeenCalledWith(input.password);
    expect(deps.createUser).toHaveBeenCalledWith({ name: input.name, email: input.email, hashedPassword: "stored-hash" });
    expect(deps.createUser).not.toHaveBeenCalledWith(expect.objectContaining({ password: input.password }));
  });

  it("JS-03: asymmetric and partial matchers verify habit ownership and defaults", async () => {
    // Arrange
    const deps = { createHabit: jest.fn().mockResolvedValue(habit) };
    // Act
    const actual = await createHabit(userId, { name: habit.name, daily_task: habit.dailyTask }, deps);
    // Assert
    expect(deps.createHabit).toHaveBeenCalledWith(expect.objectContaining({ userId, frequency: "daily", timesPerPeriod: 1 }));
    expect(actual).toMatchObject({ id: expect.any(String), user_id: userId, name: habit.name, created_at: expect.any(Date) });
    expect(actual.target_value).toBeNull();
  });

  it("JS-04: async exception handling rejects duplicate email signup", async () => {
    // Arrange
    const deps = signupMocks();
    deps.findByEmail.mockResolvedValue(user);
    // Act
    const actual = signup({ name: user.name, email: user.email, password: "Password123" }, deps);
    // Assert
    await expect(actual).rejects.toThrow("Email ya registrado");
    await expect(actual).rejects.toMatchObject({ statusCode: 400 });
    expect(deps.createUser).not.toHaveBeenCalled();
    expect(deps.hashPassword).not.toHaveBeenCalled();
  });

  it("JS-05: existence and truthiness of successful login credentials", async () => {
    // Arrange
    const deps = loginMocks();
    const input = { email: user.email, password: "Password123" };
    // Act
    const actual = await login(input, deps);
    // Assert
    expect(actual).toHaveProperty("access_token");
    expect(actual.access_token).toBeDefined();
    expect(actual.access_token).toBeTruthy();
    expect(actual.token_type).toBe("bearer");
    expect(deps.verifyPassword).toHaveBeenCalledWith(input.password, user.hashedPassword);
    expect(deps.createToken).toHaveBeenCalledWith(userId);
  });

  it("JS-06: invalid login rejects asynchronously without issuing a token", async () => {
    // Arrange
    const deps = loginMocks();
    deps.verifyPassword.mockResolvedValue(false);
    // Act
    const actual = login({ email: user.email, password: "wrong-password" }, deps);
    // Assert
    await expect(actual).rejects.toThrow("Credenciales incorrectas");
    await expect(actual).rejects.toMatchObject({ statusCode: 401 });
    expect(deps.createToken).not.toHaveBeenCalled();
  });

  it("JS-07: collections and strings reflect a newly created habit", async () => {
    // Arrange
    const savedHabits = [];
    const deps = { createHabit: jest.fn(async (data) => {
      const saved = { ...data, id: habitId, createdAt };
      savedHabits.push(saved);
      return saved;
    }) };
    // Act
    const actual = await createHabit(userId, { name: "Drink water", daily_task: "Drink two litres" }, deps);
    // Assert
    expect(savedHabits).toHaveLength(1);
    expect(savedHabits).toEqual(expect.arrayContaining([expect.objectContaining({ userId, id: habitId })]));
    expect(actual.name).toContain("water");
    expect(actual.daily_task).toMatch(/^Drink /);
  });

  it("JS-08: signup rejects duplicate email without changing the user collection", async () => {
    // Arrange
    const users = [{ ...user }];
    const deps = {
      findByEmail: jest.fn(async (email) => users.find((entry) => entry.email === email) ?? null),
      hashPassword: jest.fn().mockResolvedValue("stored-hash"),
      createUser: jest.fn(async (data) => {
        const saved = { ...data, id: "44444444-4444-4444-8444-444444444444", createdAt };
        users.push(saved);
        return saved;
      }),
    };
    const before = users.map((entry) => ({ ...entry }));
    // Act
    const actual = signup({ name: "Another user", email: user.email, password: "Password123" }, deps);
    // Assert
    await expect(actual).rejects.toThrow("Email ya registrado");
    expect(users).toStrictEqual(before);
    expect(users).toHaveLength(1);
    expect(deps.createUser).not.toHaveBeenCalled();
  });

  it("JS-09: logging returns the expected value and completed truthiness", async () => {
    // Arrange
    const deps = logMocks();
    const input = { habit_id: habitId, date: "2026-10-03", note: "Finished drinking water" };
    // Act
    const actual = await toggleHabitLog(userId, input, deps);
    // Assert
    expect(actual.statusCode).toBe(201);
    expect(actual.body.completed).toBeTruthy();
    expect(actual.body.note).toContain("water");
    expect(actual.body).toMatchObject({ habit_id: habitId, user_id: userId, date: input.date });
    expect(deps.deleteLog).not.toHaveBeenCalled();
  });

  it("JS-10: missing login account short-circuits password verification", async () => {
    // Arrange
    const deps = loginMocks();
    deps.findByEmail.mockResolvedValue(null);
    // Act
    const actual = login({ email: "missing@example.com", password: "Password123" }, deps);
    // Assert
    await expect(actual).rejects.toThrow("Credenciales incorrectas");
    expect(deps.verifyPassword).not.toHaveBeenCalled();
    expect(deps.createToken).not.toHaveBeenCalled();
  });
});
