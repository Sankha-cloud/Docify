import { describe, it, expect } from "vitest";
import { getErrorMessage } from "@/lib/errors";

describe("getErrorMessage", () => {
  it("returns the message of a real Error instance", () => {
    const err = new Error("database is down");
    expect(getErrorMessage(err, "fallback")).toBe("database is down");
  });

  it("returns the fallback when given a thrown string", () => {
    expect(getErrorMessage("raw string", "fallback")).toBe("fallback");
  });

  it("returns the fallback when given a thrown object literal", () => {
    expect(getErrorMessage({ code: 500 }, "fallback")).toBe("fallback");
  });

  it("returns the fallback when given null or undefined", () => {
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("preserves empty messages on Error instances (does not fall back)", () => {
    // `new Error()` yields `message === ""`. The helper returns that empty
    // string rather than the fallback — this matches the stricter
    // `instanceof Error` contract and prevents silently masking real,
    // intentionally-blank errors from upstream libraries.
    expect(getErrorMessage(new Error(), "fallback")).toBe("");
  });

  it("handles subclasses of Error", () => {
    class HttpError extends Error {
      constructor(public status: number, message: string) {
        super(message);
      }
    }
    expect(getErrorMessage(new HttpError(404, "not found"), "fallback")).toBe(
      "not found",
    );
  });
});
