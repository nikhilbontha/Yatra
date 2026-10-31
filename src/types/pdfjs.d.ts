declare module 'pdfjs-dist/legacy/build/pdf.min.mjs' {
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };
  export function getDocument(params: any): {
    promise: Promise<any>;
  };
  export const version: string;
}

