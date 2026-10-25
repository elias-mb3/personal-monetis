import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfText(content: Buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(content));
  const { text } = await extractText(pdf, { mergePages: false });
  return text.join("\n");
}
