import type { TiptapNode } from "@/lib/export/types";

/**
 * Parse a Tiptap JSON document string and return its top-level content nodes.
 * Returns an empty array if the input is not valid JSON or lacks a content
 * array — callers render a skeleton in that case.
 */
export function extractTopNodes(content: string): TiptapNode[] {
  try {
    const parsed = JSON.parse(content) as { content?: TiptapNode[] };
    return parsed.content ?? [];
  } catch {
    return [];
  }
}

/**
 * Recursively flatten a Tiptap node's text content into a plain string.
 * Leaf `text` nodes return their literal text; any other node concatenates
 * its children. Nodes with no text descendants return an empty string.
 */
export function nodeText(node: TiptapNode): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(nodeText).join("");
}
