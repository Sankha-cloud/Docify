import { describe, it, expect } from "vitest";
import { nodeToMarkdown } from "@/lib/export/markdown";
import type { TiptapNode } from "@/lib/export/types";

// Small helpers to keep test fixtures readable.
const text = (s: string, marks: TiptapNode["marks"] = undefined): TiptapNode => ({
  type: "text",
  text: s,
  ...(marks ? { marks } : {}),
});
const paragraph = (...children: TiptapNode[]): TiptapNode => ({
  type: "paragraph",
  content: children,
});
const heading = (level: number, ...children: TiptapNode[]): TiptapNode => ({
  type: "heading",
  attrs: { level },
  content: children,
});
const doc = (...children: TiptapNode[]): TiptapNode => ({
  type: "doc",
  content: children,
});
const listItem = (...children: TiptapNode[]): TiptapNode => ({
  type: "listItem",
  content: children,
});

describe("nodeToMarkdown", () => {
  describe("text + marks", () => {
    it("serializes plain text unchanged", () => {
      expect(nodeToMarkdown(text("hello"))).toBe("hello");
    });

    it("wraps bold text with **", () => {
      expect(nodeToMarkdown(text("x", [{ type: "bold" }]))).toBe("**x**");
    });

    it("wraps italic text with *", () => {
      expect(nodeToMarkdown(text("x", [{ type: "italic" }]))).toBe("*x*");
    });

    it("wraps strike-through text with ~~", () => {
      expect(nodeToMarkdown(text("x", [{ type: "strike" }]))).toBe("~~x~~");
    });

    it("wraps inline code with backticks", () => {
      expect(nodeToMarkdown(text("x", [{ type: "code" }]))).toBe("`x`");
    });

    it("serializes a link as [text](href)", () => {
      const node = text("click", [
        { type: "link", attrs: { href: "https://example.com" } },
      ]);
      expect(nodeToMarkdown(node)).toBe("[click](https://example.com)");
    });

    it("skips a link mark with no href (avoids producing '[x]()')", () => {
      const node = text("click", [{ type: "link" }]);
      expect(nodeToMarkdown(node)).toBe("click");
    });

    it("stacks multiple marks in declaration order", () => {
      // Bold applied first, then italic — bold wraps the inner italic.
      const node = text("x", [{ type: "bold" }, { type: "italic" }]);
      expect(nodeToMarkdown(node)).toBe("***x***");
    });
  });

  describe("block nodes", () => {
    it("emits headings using #-hashes matching the level attr", () => {
      expect(nodeToMarkdown(heading(1, text("Title")))).toBe("# Title\n\n");
      expect(nodeToMarkdown(heading(2, text("Section")))).toBe("## Section\n\n");
      expect(nodeToMarkdown(heading(3, text("Sub")))).toBe("### Sub\n\n");
    });

    it("defaults a heading to level 1 when the level attr is missing", () => {
      const h: TiptapNode = { type: "heading", content: [text("X")] };
      expect(nodeToMarkdown(h)).toBe("# X\n\n");
    });

    it("terminates paragraphs with a blank line", () => {
      expect(nodeToMarkdown(paragraph(text("one")))).toBe("one\n\n");
    });

    it("emits horizontal rule as ---", () => {
      expect(nodeToMarkdown({ type: "horizontalRule" })).toBe("---\n\n");
    });

    it("emits hardBreak as markdown's two-space line break", () => {
      expect(nodeToMarkdown({ type: "hardBreak" })).toBe("  \n");
    });

    it("emits images as ![alt](src), using empty alt when absent", () => {
      expect(
        nodeToMarkdown({
          type: "image",
          attrs: { src: "https://img/x.png", alt: "Logo" },
        }),
      ).toBe("![Logo](https://img/x.png)");
      expect(
        nodeToMarkdown({ type: "image", attrs: { src: "https://img/y.png" } }),
      ).toBe("![](https://img/y.png)");
    });

    it("emits an empty string for an image with no src", () => {
      // Matches the defensive branch — guard against half-constructed nodes.
      expect(nodeToMarkdown({ type: "image", attrs: { alt: "oops" } })).toBe("");
    });

    it("fences code blocks with triple backticks", () => {
      const node: TiptapNode = {
        type: "codeBlock",
        content: [text("const x = 1;")],
      };
      expect(nodeToMarkdown(node)).toBe("```\nconst x = 1;\n```\n\n");
    });

    it("prefixes every line of a blockquote with '> '", () => {
      const node: TiptapNode = {
        type: "blockquote",
        content: [paragraph(text("line one")), paragraph(text("line two"))],
      };
      // The walker concatenates children then applies > to each trimmed line.
      const out = nodeToMarkdown(node);
      expect(out).toBe("> line one\n> \n> line two\n\n");
    });
  });

  describe("lists", () => {
    it("emits a bullet list with '- ' markers", () => {
      const list: TiptapNode = {
        type: "bulletList",
        content: [
          listItem(paragraph(text("apple"))),
          listItem(paragraph(text("banana"))),
        ],
      };
      expect(nodeToMarkdown(list)).toBe("- apple\n- banana\n\n");
    });

    it("emits an ordered list with sequential numbers", () => {
      const list: TiptapNode = {
        type: "orderedList",
        content: [
          listItem(paragraph(text("first"))),
          listItem(paragraph(text("second"))),
          listItem(paragraph(text("third"))),
        ],
      };
      expect(nodeToMarkdown(list)).toBe(
        "1. first\n2. second\n3. third\n\n",
      );
    });

    it("indents nested lists by two spaces per depth level", () => {
      const nested: TiptapNode = {
        type: "bulletList",
        content: [
          listItem(
            paragraph(text("outer")),
            {
              type: "bulletList",
              content: [listItem(paragraph(text("inner")))],
            },
          ),
        ],
      };
      const out = nodeToMarkdown(nested);
      // outer at depth 0, inner at depth 1 (2-space indent).
      expect(out).toContain("- outer");
      expect(out).toContain("  - inner");
    });
  });

  describe("whole document", () => {
    it("serializes a realistic mixed document", () => {
      const d = doc(
        heading(1, text("DocFlow")),
        paragraph(
          text("A "),
          text("collaborative", [{ type: "bold" }]),
          text(" editor."),
        ),
        heading(2, text("Features")),
        {
          type: "bulletList",
          content: [
            listItem(paragraph(text("Realtime"))),
            listItem(paragraph(text("Export"))),
          ],
        },
      );
      expect(nodeToMarkdown(d)).toBe(
        "# DocFlow\n\nA **collaborative** editor.\n\n## Features\n\n- Realtime\n- Export\n\n",
      );
    });

    it("falls back to rendering children for unknown node types", () => {
      // The default branch prevents data loss from unknown block types;
      // the wrapper is dropped but inline text is preserved.
      const unknown: TiptapNode = {
        type: "someFutureBlock",
        content: [text("survived")],
      };
      expect(nodeToMarkdown(unknown)).toBe("survived");
    });

    it("handles a doc with no content array", () => {
      expect(nodeToMarkdown({ type: "doc" })).toBe("");
    });
  });
});
