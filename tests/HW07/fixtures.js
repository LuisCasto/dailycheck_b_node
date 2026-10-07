import { jest } from "@jest/globals";

// Static fixtures: immutable, predictable baseline values reused by tests.
export const IDS = Object.freeze({
  user: "11111111-1111-4111-8111-111111111111",
  habit: "22222222-2222-4222-8222-222222222222",
  log: "33333333-3333-4333-8333-333333333333",
});
export const SIGNUP_INPUT = Object.freeze({ name: "Axel", email: "axel@example.com", password: "Password123" });
export const HABIT_INPUT = Object.freeze({ name: "Drink water", daily_task: "Drink two litres" });
export const LOG_INPUT = Object.freeze({ habit_id: IDS.habit, date: "2026-10-03", note: "Done" });
export const CREATED_AT = "2026-01-01T00:00:00.000Z";

// Factory fixtures: each call creates a fresh object, including fresh Date objects.
export function makeUser(overrides = {}) {
  return { id: IDS.user, name: SIGNUP_INPUT.name, email: SIGNUP_INPUT.email, hashedPassword: "stored-hash", createdAt: new Date(CREATED_AT), ...overrides };
}
export function makeHabit(overrides = {}) {
  return { id: IDS.habit, userId: IDS.user, name: HABIT_INPUT.name, dailyTask: HABIT_INPUT.daily_task, description: "", category: "Otro", icon: "🎯", targetValue: null, unit: null, frequency: "daily", timesPerPeriod: 1, createdAt: new Date(CREATED_AT), ...overrides };
}
export function makeLog(overrides = {}) {
  return { id: IDS.log, habitId: IDS.habit, userId: IDS.user, date: new Date(`${LOG_INPUT.date}T00:00:00.000Z`), completed: true, note: LOG_INPUT.note, loggedAt: new Date(CREATED_AT), ...overrides };
}

export function makeDependencies({ user, habit, log }) {
  return {
    signup: {
      findByEmail: jest.fn().mockResolvedValue(null),
      hashPassword: jest.fn().mockResolvedValue("stored-hash"),
      createUser: jest.fn().mockResolvedValue(user),
    },
    login: {
      findByEmail: jest.fn().mockResolvedValue(user),
      verifyPassword: jest.fn().mockResolvedValue(true),
      createToken: jest.fn().mockResolvedValue("test-token"),
    },
    habit: { createHabit: jest.fn().mockResolvedValue(habit) },
    log: {
      findOwnedHabit: jest.fn().mockResolvedValue(habit),
      findLog: jest.fn().mockResolvedValue(null),
      createLog: jest.fn().mockResolvedValue(log),
      deleteLog: jest.fn().mockResolvedValue(undefined),
    },
  };
}

// Suite-owned resource: no network/database; reset between tests and clear at teardown.
export function makeUserStore() {
  let users = [];
  return {
    reset(seed = []) { users = seed.map((user) => ({ ...user, createdAt: new Date(user.createdAt) })); },
    findByEmail(email) { return users.find((user) => user.email === email) ?? null; },
    insert(user) { users.push(user); return user; },
    snapshot() { return users.map((user) => ({ ...user, createdAt: new Date(user.createdAt) })); },
    clear() { users = []; },
  };
}
