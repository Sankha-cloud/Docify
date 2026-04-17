import { describe, it, expect } from "vitest";
import {
  extractTopNodes,
  nodeText,
} from "@/app/_components/template-preview-helpers";
import type { TiptapNode } from "@/lib/export/types";

describe("extractTopNodes", () => {
  it("returns the top-level content array of a valid Tiptap doc", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
        { type: "paragraph", content: [{ type: "text", text: "Body" }] },
      ],
    });
    const nodes = extractTopNodes(raw);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].type).toBe("heading");
    expect(nodes[1].type).toBe("paragraph");
  });

  it("returns an empty array when content is missing", () => {
    expect(extractTopNodes(JSON.stringify({ type: "doc" }))).toEqual([]);
  });

  it("returns an empty array when input is not valid JSON", () => {
    // Defensive: seeded templates in Convex are strings we control, but
    // a malformed row must never crash the home page render.
    expect(extractTopNodes("not json at all {")).toEqual([]);
    expect(extractTopNodes("")).toEqual([]);
  });

  it("returns an empty array when JSON is valid but content is null", () => {
    expect(extractTopNodes(JSON.stringify({ type: "doc", content: null }))).toEqual(
      [],
    );
  });
});

describe("nodeText", () => {
  it("returns the literal text of a leaf text node", () => {
    const node: TiptapNode = { type: "text", text: "hello" };
    expect(nodeText(node)).toBe("hello");
  });

  it("flattens a paragraph's inline children into a single string", () => {
    const node: TiptapNode = {
      type: "paragraph",
      content: [
        { type: "text", text: "one " },
        { type: "text", text: "two" },
      ],
    };
    expect(nodeText(node)).toBe("one two");
  });

  it("recursively walks arbitrarily nested structures", () => {
    const node: TiptapNode = {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "outer " },
            {
              type: "someInlineWrapper",
              content: [{ type: "text", text: "inner" }],
            },
          ],
        },
      ],
    };
    expect(nodeText(node)).toBe("outer inner");
  });

  it("returns an empty string for a node with no text and no content", () => {
    expect(nodeText({ type: "horizontalRule" })).toBe("");
  });

  it("prefers the node's own text over walking content", () => {
    // Tiptap leaf text nodes don't normally have `content`, but this
    // pins the behaviour in case a future schema change introduces both.
    const node: TiptapNode = {
      type: "text",
      text: "shallow",
      content: [{ type: "text", text: "deep (should be ignored)" }],
    };
    expect(nodeText(node)).toBe("shallow");
  });
});
