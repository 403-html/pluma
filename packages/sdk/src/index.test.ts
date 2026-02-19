import { describe, expect, it } from "vitest";
import { HelloWorld } from "./index";

describe("HelloWorld", () => {
  it("returns hello world", () => {
    const hello = new HelloWorld();
    expect(hello.message()).toBe("hello world");
  });
});
