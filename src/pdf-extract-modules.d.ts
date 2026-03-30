declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
  }
  function pdfParse(data: Buffer): Promise<PdfParseResult>;
  export = pdfParse;
}

declare module "pdfjs-dist/build/pdf.mjs" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export const VerbosityLevel: { ERRORS: number };
  export function getDocument(src: object): {
    promise: Promise<{
      numPages: number;
      getPage(pageNumber: number): Promise<{
        getTextContent(): Promise<{ items: unknown[] }>;
      }>;
      cleanup?: () => Promise<void>;
    }>;
  };
}
