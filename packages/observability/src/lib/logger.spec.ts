import { logger } from "./logger";
import { registerActiveLogger, type ActiveLogger } from "./logger-registry";
import { withTags } from "./tags";

describe("logger", () => {
  it("falls back to console when no logger is registered (safe to call before setup())", () => {
    const spy = jest.spyOn(console, "info").mockImplementation(() => undefined);
    logger.info({ foo: "bar" }, "hello");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("delegates to the registered logger once one exists", () => {
    const calls: unknown[] = [];
    const fake: ActiveLogger = {
      debug: (f, m) => calls.push(["debug", f, m]),
      info: (f, m) => calls.push(["info", f, m]),
      warn: (f, m) => calls.push(["warn", f, m]),
      error: (f, m) => calls.push(["error", f, m]),
    };
    registerActiveLogger(fake);
    logger.warn({ code: 42 }, "careful");
    expect(calls).toEqual([["warn", { code: 42 }, "careful"]]);
  });

  it("automatically merges active tags into every call", () => {
    const calls: unknown[] = [];
    const fake: ActiveLogger = {
      debug: (f, m) => calls.push([f, m]),
      info: (f, m) => calls.push([f, m]),
      warn: (f, m) => calls.push([f, m]),
      error: (f, m) => calls.push([f, m]),
    };
    registerActiveLogger(fake);
    withTags({ requestId: "xyz" }, () => {
      logger.error({ detail: "boom" }, "failed");
    });
    expect(calls).toEqual([[{ requestId: "xyz", detail: "boom" }, "failed"]]);
  });
});
