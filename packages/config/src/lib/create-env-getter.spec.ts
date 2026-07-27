import { z } from "zod";
import { createEnvGetter } from "./create-env-getter";

const schema = z.object({
  FOO: z.string().min(3),
});

describe("createEnvGetter", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns validated env vars when present and valid", () => {
    process.env.FOO = "bar";
    const getEnv = createEnvGetter(schema);
    expect(getEnv().FOO).toEqual("bar");
  });

  it("throws when a required var is missing", () => {
    process.env.FOO = undefined;
    const getEnv = createEnvGetter(schema);
    expect(() => getEnv()).toThrow();
  });

  it("throws when a var fails its own validation", () => {
    process.env.FOO = "x";
    const getEnv = createEnvGetter(schema);
    expect(() => getEnv()).toThrow();
  });

  it("caches the result — a getter only validates once", () => {
    process.env.FOO = "bar";
    const getEnv = createEnvGetter(schema);
    const first = getEnv();
    process.env.FOO = "changed";
    const second = getEnv();
    expect(second).toBe(first);
    expect(second.FOO).toEqual("bar");
  });

  it("gives each createEnvGetter() call its own independent cache", () => {
    process.env.FOO = "bar";
    const getEnvA = createEnvGetter(schema);
    const getEnvB = createEnvGetter(schema);
    expect(getEnvA()).not.toBe(getEnvB());
  });
});
