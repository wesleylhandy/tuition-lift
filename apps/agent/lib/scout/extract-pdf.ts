/**
 * extract-pdf: pdf-parse for digital PDFs; Vision LLM for scanned (T024).
 * Text density check: if >= 100 chars/page use text extraction; else render first page and use vision.
 */
import { PDFParse } from "pdf-parse";
import { extractFromVision, extractFromText } from "./extract-vision";
import type { ExtractedScholarshipData } from "@repo/db";

const TEXT_DENSITY_THRESHOLD = 100; // chars per page

/**
 * Extracts scholarship data from PDF buffer.
 * Digital PDF (high text density): pdf-parse → text → LLM.
 * Scanned PDF (low text density): render first page → vision LLM.
 */
export async function extractFromPdf(
  buffer: ArrayBuffer | Buffer
): Promise<ExtractedScholarshipData> {
  const data = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer;
  const parser = new PDFParse({ data });

  try {
    const textResult = await parser.getText();
    const numPages = textResult.total || 1;
    const text = textResult.text ?? "";
    const charsPerPage = text.length / numPages;

    if (charsPerPage >= TEXT_DENSITY_THRESHOLD && text.trim().length > 0) {
      return extractFromText(text);
    }

    const screenshotResult = await parser.getScreenshot({
      first: 1,
      scale: 1.5,
      imageDataUrl: true,
    });
    const firstPage = screenshotResult.pages[0];
    if (!firstPage?.dataUrl) {
      throw new Error(
        "No data found. If this is a scanned document, try uploading a clearer screenshot as PNG or JPG."
      );
    }

    const match = firstPage.dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
    if (!match || !match[2]) {
      throw new Error("Failed to process PDF image");
    }
    const base64 = match[2];
    const mime = match[1];
    const mimeType = (mime === "image/jpeg" ? "image/jpeg" : "image/png") as
      | "image/png"
      | "image/jpeg";

    return extractFromVision(base64, mimeType);
  } finally {
    await parser.destroy();
  }
}
