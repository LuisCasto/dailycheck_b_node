// HW07: corepack pnpm test:hw07
// All homework: corepack pnpm test | Typecheck: corepack pnpm typecheck | Build: corepack pnpm build
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { signup, login, createHabit, toggleHabitLog } from "../../.jest-build/src/services.js";
import { IDS, SIGNUP_INPUT, HABIT_INPUT, LOG_INPUT, CREATED_AT, makeUser, makeHabit, makeLog, makeDependencies, makeUserStore } from "./fixtures.js";

describe("HW07: isolated services using hooks and static/factory fixtures", () => {
  let store;
  let baseline;
  let fixtures;
  let deps;

  beforeAll(() => {
    // Once per suite: immutable baseline and a suite-owned in-memory resource.
    baseline = Object.freeze({ signup: SIGNUP_INPUT, habit: HABIT_INPUT, log: LOG_INPUT });
    store = makeUserStore();
  });

  beforeEach(() => {
    // Shared Arrange: fresh mutable data, Dates, mock behavior, and call history.
    fixtures = { user: makeUser(), habit: makeHabit(), log: makeLog() };
    deps = makeDependencies(fixtures);
    store.reset();
  });

  afterEach(() => {
    // Restore spies (including the console spy below); clear mock call history.
    jest.restoreAllMocks();
    jest.clearAllMocks();
    store.clear();
  });

  afterAll(() => {
    // Release the suite-owned resource after the final test, even on test failure.
    store.clear();
    store = undefined;
    baseline = undefined;
    fixtures = undefined;
    deps = undefined;
  });

  it("HW07-01: signs up using the static valid input", async () => {
    // Arrange
    const input = baseline.signup;
    // Act
    const actual = await signup(input, deps.signup);
    // Assert
    expect(actual).toStrictEqual({ id: IDS.user, name: input.name, email: input.email, created_at: new Date(CREATED_AT) });
    expect(deps.signup.createUser).toHaveBeenCalledWith({ name: input.name, email: input.email, hashedPassword: "stored-hash" });
    expect(actual).not.toHaveProperty("hashedPassword");
  });

  it("HW07-02: rejects a duplicate email without saving", async () => {
    // Arrange
    deps.signup.findByEmail.mockResolvedValue(fixtures.user);
    // Act
    const actual = signup(baseline.signup, deps.signup);
    // Assert
    await expect(actual).rejects.toMatchObject({ statusCode: 400 });
    expect(deps.signup.createUser).not.toHaveBeenCalled();
    expect(deps.signup.hashPassword).not.toHaveBeenCalled();
  });

  it("HW07-03: logs in successfully with fresh mocks", async () => {
    // Arrange
    const input = { email: baseline.signup.email, password: baseline.signup.password };
    // Act
    const actual = await login(input, deps.login);
    // Assert
    expect(actual).toEqual({ access_token: "test-token", token_type: "bearer" });
    expect(deps.login.createToken).toHaveBeenCalledTimes(1);
    expect(deps.login.createToken).toHaveBeenCalledWith(IDS.user);
  });

  it("HW07-04: rejects an invalid password without issuing a token", async () => {
    // Arrange
    deps.login.verifyPassword.mockResolvedValue(false);
    // Act
    const actual = login({ email: baseline.signup.email, password: "wrong-password" }, deps.login);
    // Assert
    await expect(actual).rejects.toThrow("Credenciales incorrectas");
    expect(deps.login.createToken).not.toHaveBeenCalled();
  });

  it("HW07-05: customizes a factory habit without modifying the static input", async () => {
    // Arrange
    const input = { ...baseline.habit, name: "Read a book", frequency: "weekly" };
    deps.habit.createHabit.mockResolvedValue(makeHabit({ name: input.name, frequency: input.frequency }));
    // Act
    const actual = await createHabit(IDS.user, input, deps.habit);
    // Assert
    expect(actual).toMatchObject({ name: "Read a book", frequency: "weekly", user_id: IDS.user });
    expect(baseline.habit.name).toBe("Drink water");
    expect(deps.habit.createHabit).toHaveBeenCalledWith(expect.objectContaining({ userId: IDS.user, frequency: "weekly" }));
  });

  it("HW07-06: logs completion using the static date and note", async () => {
    // Arrange
    const input = baseline.log;
    // Act
    const actual = await toggleHabitLog(IDS.user, input, deps.log);
    // Assert
    expect(actual).toMatchObject({ statusCode: 201, body: { completed: true, date: input.date, note: input.note } });
    expect(deps.log.createLog).toHaveBeenCalledWith({ habitId: IDS.habit, userId: IDS.user, date: fixtures.log.date, completed: true, note: input.note });
  });

  it("HW07-07: rejects logging an unowned habit", async () => {
    // Arrange
    deps.log.findOwnedHabit.mockResolvedValue(null);
    // Act
    const actual = toggleHabitLog(IDS.user, baseline.log, deps.log);
    // Assert
    await expect(actual).rejects.toMatchObject({ statusCode: 404 });
    expect(deps.log.findLog).not.toHaveBeenCalled();
    expect(deps.log.createLog).not.toHaveBeenCalled();
  });

  it("HW07-08: toggles off an existing factory-created log", async () => {
    // Arrange
    deps.log.findLog.mockResolvedValue(fixtures.log);
    // Act
    const actual = await toggleHabitLog(IDS.user, baseline.log, deps.log);
    // Assert
    expect(actual).toMatchObject({ statusCode: 200, body: { deleted: true, log_id: IDS.log } });
    expect(deps.log.deleteLog).toHaveBeenCalledWith(IDS.log);
    expect(deps.log.createLog).not.toHaveBeenCalled();
  });

  it("HW07-09: factory objects and their Dates do not share mutable state", () => {
    // Arrange
    const first = fixtures.user;
    const second = makeUser({ email: "another@example.com" });
    // Act
    first.name = "Changed";
    first.createdAt.setUTCFullYear(2030);
    // Assert
    expect(second.name).toBe(SIGNUP_INPUT.name);
    expect(second.createdAt.toISOString()).toBe(CREATED_AT);
    expect(second.email).toBe("another@example.com");
    expect(SIGNUP_INPUT.name).toBe("Axel");
  });

  it("HW07-10: rejects duplicate signup in a reset in-memory store", async () => {
    // Arrange
    store.reset([fixtures.user]);
    deps.signup.findByEmail.mockImplementation(async (email) => store.findByEmail(email));
    deps.signup.createUser.mockImplementation(async (data) => store.insert(makeUser(data)));
    const before = store.snapshot();
    // Act
    const actual = signup(baseline.signup, deps.signup);
    // Assert
    await expect(actual).rejects.toThrow("Email ya registrado");
    expect(store.snapshot()).toStrictEqual(before);
    expect(deps.signup.createUser).not.toHaveBeenCalled();
  });

  it("HW07-11: can create a user in its own clean store", async () => {
    // Arrange
    const input = { ...baseline.signup, email: "new@example.com" };
    deps.signup.findByEmail.mockImplementation(async (email) => store.findByEmail(email));
    deps.signup.createUser.mockImplementation(async (data) => store.insert(makeUser(data)));
    const outputSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    // Act
    const actual = await signup(input, deps.signup);
    // Assert
    expect(actual.email).toBe(input.email);
    expect(store.snapshot()).toHaveLength(1);
    expect(deps.signup.hashPassword).toHaveBeenCalledTimes(1);
    expect(outputSpy).not.toHaveBeenCalled();
    // afterEach restores the console spy automatically.
  });
});
