import { withTags, getActiveTags } from "./tags";

describe("tags", () => {
  it("has no active tags outside any withTags() scope", () => {
    expect(getActiveTags()).toEqual({});
  });

  it("makes tags available inside the scope", () => {
    withTags({ requestId: "abc" }, () => {
      expect(getActiveTags()).toEqual({ requestId: "abc" });
    });
  });

  it("merges nested scopes rather than replacing", () => {
    withTags({ a: 1 }, () => {
      withTags({ b: 2 }, () => {
        expect(getActiveTags()).toEqual({ a: 1, b: 2 });
      });
      expect(getActiveTags()).toEqual({ a: 1 });
    });
  });

  it("propagates across async boundaries", async () => {
    await withTags({ requestId: "async-1" }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(getActiveTags()).toEqual({ requestId: "async-1" });
    });
  });

  it("does not leak tags outside its own scope", () => {
    withTags({ requestId: "leaky?" }, () => undefined);
    expect(getActiveTags()).toEqual({});
  });
});
