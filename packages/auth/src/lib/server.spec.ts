describe("auth (server)", () => {
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
    const { auth } = await import("./server");
    expect(auth.handler).toBeDefined();
    expect(auth.api).toBeDefined();
  });

  it("throws at construction time if required env vars are missing", async () => {
    process.env.BETTER_AUTH_SECRET = undefined;
    await expect(import("./server")).rejects.toThrow();
  });
});
