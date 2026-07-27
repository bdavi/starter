describe("db client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      BETTER_AUTH_SECRET: "a".repeat(32),
      BETTER_AUTH_URL: "http://localhost:3000",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("constructs without connecting to a database", async () => {
    const { db } = await import("./client");
    expect(db).toBeDefined();
    expect(db.select).toBeDefined();
  });

  it("throws at construction time if DATABASE_URL is missing", async () => {
    process.env.DATABASE_URL = undefined;
    await expect(import("./client")).rejects.toThrow();
  });
});
