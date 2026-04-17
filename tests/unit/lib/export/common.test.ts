import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "@/lib/export/common";

describe("sanitizeFilename", () => {
  it("passes through safe filenames unchanged", () => {
    expect(sanitizeFilename("report")).toBe("report");
    expect(sanitizeFilename("Q4 Results 2026")).toBe("Q4 Results 2026");
    expect(sanitizeFilename("notes-v2.draft")).toBe("notes-v2.draft");
  });

  it("strips unsafe punctuation while keeping word chars, dots, and dashes", () => {
    expect(sanitizeFilename("hello/world")).toBe("helloworld");
    expect(sanitizeFilename("a:b*c?d|e")).toBe("abcde");
    expect(sanitizeFilename("<title>")).toBe("title");
  });

  it("preserves underscores (a word character)", () => {
    expect(sanitizeFilename("my_notes")).toBe("my_notes");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeFilename("   spaced   ")).toBe("spaced");
  });

  it("falls back to 'document' for empty or whitespace-only input", () => {
    expect(sanitizeFilename("")).toBe("document");
    expect(sanitizeFilename("   ")).toBe("document");
  });

  it("falls back to 'document' when every character is stripped", () => {
    // Only unsafe characters → after substitution the string is empty → fallback.
    expect(sanitizeFilename("///")).toBe("document");
    expect(sanitizeFilename("***???")).toBe("document");
  });

  it("does not truncate very long names (callers can wrap if needed)", () => {
    const long = "a".repeat(300);
    expect(sanitizeFilename(long)).toBe(long);
  });
});
