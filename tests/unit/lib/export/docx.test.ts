import { describe, it, expect } from "vitest";
import { detectImageType } from "@/lib/export/docx";

// Byte-signature values from the respective image format specs.
const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const GIF_HEADER = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const BMP_HEADER = new Uint8Array([0x42, 0x4d, 0x36, 0x00]);

describe("detectImageType", () => {
  // Byte-signature detection takes precedence — the contract is that
  // the magic bytes decide, not the URL extension. This matters because
  // CDNs frequently strip or lie about extensions (e.g. Cloudinary's
  // `/image/upload/v1/...`).
  describe("byte-signature detection", () => {
    it("detects PNG from its magic bytes", () => {
      expect(detectImageType("any-url", PNG_HEADER)).toBe("png");
    });

    it("detects JPEG from its magic bytes", () => {
      expect(detectImageType("any-url", JPEG_HEADER)).toBe("jpg");
    });

    it("detects GIF from its magic bytes", () => {
      expect(detectImageType("any-url", GIF_HEADER)).toBe("gif");
    });

    it("detects BMP from its magic bytes", () => {
      expect(detectImageType("any-url", BMP_HEADER)).toBe("bmp");
    });

    it("lets byte signature win when the URL extension disagrees", () => {
      // URL says .gif, bytes say PNG — bytes win.
      expect(detectImageType("photo.gif", PNG_HEADER)).toBe("png");
    });
  });

  // Extension fallback only kicks in when the bytes don't match a known
  // signature — this is the degraded-but-useful path for images that
  // ship with unusual/truncated headers.
  describe("extension fallback", () => {
    const unknownBytes = new Uint8Array([0x00, 0x00, 0x00, 0x00]);

    it("falls back to jpg for .jpg / .jpeg URLs", () => {
      expect(detectImageType("photo.jpg", unknownBytes)).toBe("jpg");
      expect(detectImageType("photo.jpeg", unknownBytes)).toBe("jpg");
    });

    it("falls back to gif for .gif URLs", () => {
      expect(detectImageType("anim.gif", unknownBytes)).toBe("gif");
    });

    it("falls back to bmp for .bmp URLs", () => {
      expect(detectImageType("old.bmp", unknownBytes)).toBe("bmp");
    });

    it("is case-insensitive on the extension", () => {
      expect(detectImageType("PHOTO.JPG", unknownBytes)).toBe("jpg");
      expect(detectImageType("PHOTO.JPEG", unknownBytes)).toBe("jpg");
    });

    it("defaults to png when neither bytes nor extension match", () => {
      expect(detectImageType("no-extension", unknownBytes)).toBe("png");
      expect(detectImageType("file.webp", unknownBytes)).toBe("png");
    });
  });
});
