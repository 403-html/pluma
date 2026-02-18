import { describe, expect, it } from "vitest";
import { HelloWorld } from "./index.js";

describe("HelloWorld", () => {
  it("returns hello world", () => {
    const hello = new HelloWorld();
    expect(hello.message()).toBe("hello world");
  });
});
