'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  Maximize2,
} from 'lucide-react';

export interface PdfCanvasViewerProps {
  source: string;
  title: string;
  zoom?: number;
  rotation?: number;
  onDownload?: () => void;
}

function dataUriToUint8Array(dataUriOrBase64: string): Uint8Array {
  if (dataUriOrBase64.startsWith('data:')) {
    const base64Index = dataUriOrBase64.indexOf(';base64,');
    if (base64Index !== -1) {
      const base64 = dataUriOrBase64.substring(base64Index + 8);
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
  }

  // Raw base64 string
  try {
    const binaryString = atob(dataUriOrBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch {
    return new TextEncoder().encode(dataUriOrBase64);
  }
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  source,
  title,
  zoom = 1,
  rotation = 0,
  onDownload,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  // Generate a safe Blob URL for native external viewing/downloading
  useEffect(() => {
    let url: string | null = null;
    if (source.startsWith('data:application/pdf') || source.startsWith('JVBERi0')) {
      try {
        const bytes = dataUriToUint8Array(source);
        const blob = new Blob([bytes as any], { type: 'application/pdf' });
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (e) {
        console.warn('Failed to create Blob URL for PDF:', e);
      }
    } else if (source.startsWith('http') || source.startsWith('blob:') || source.startsWith('/')) {
      setBlobUrl(source);
    }

    return () => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [source]);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      if (!source) return;
      setIsLoading(true);
      setRenderError(null);

      try {
        // Dynamic import to prevent SSR canvas issues in Next.js Turbopack
        const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.min.mjs');

        if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        let pdfData: Uint8Array;
        if (
          source.startsWith('data:') ||
          (!source.startsWith('http') && !source.startsWith('/') && !source.startsWith('blob:'))
        ) {
          pdfData = dataUriToUint8Array(source);
        } else {
          const resp = await fetch(source);
          const buffer = await resp.arrayBuffer();
          pdfData = new Uint8Array(buffer);
        }

        const loadingTask = pdfjs.getDocument({
          data: pdfData,
          isEvalSupported: false,
        });

        const doc = await loadingTask.promise;

        if (isCancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err: any) {
        console.warn('PDF.js parsing notice:', err?.message || err);
        if (!isCancelled) {
          setRenderError(err?.message || 'Unable to parse PDF on this device');
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {}
        pdfDocRef.current = null;
      }
    };
  }, [source]);

  // Render active page onto Canvas
  const renderPage = useCallback(async () => {
    if (!pdfDocRef.current || !canvasRef.current || !containerRef.current) return;

    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      const page = await pdfDocRef.current.getPage(currentPage);
      const containerWidth = containerRef.current.clientWidth || 360;
      const initialViewport = page.getViewport({ scale: 1, rotation });

      // Responsive scale to fit mobile viewport nicely, multiplied by user zoom
      const fitScale = (containerWidth - 24) / initialViewport.width;
      const safeFitScale = Math.max(0.65, Math.min(fitScale, 1.6));
      const effectiveScale = safeFitScale * zoom;

      const viewport = page.getViewport({ scale: effectiveScale, rotation });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.save();
      ctx.scale(dpr, dpr);

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
      ctx.restore();
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('PDF page rendering notice:', err?.message || err);
      }
    }
  }, [currentPage, zoom, rotation]);

  useEffect(() => {
    if (!isLoading && pdfDocRef.current) {
      renderPage();
    }
  }, [isLoading, currentPage, zoom, rotation, renderPage]);

  const handleOpenExternal = () => {
    const targetUrl = blobUrl || source;
    if (!targetUrl) return;
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[62vh] rounded-2xl overflow-hidden border border-emerald-500/30 bg-[#07130e] flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(15,91,68,0.3)]"
    >
      {/* Top Floating Utility Bar */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2 py-1 rounded-xl border border-emerald-500/25 text-white shadow-lg">
        <button
          type="button"
          onClick={handleOpenExternal}
          title="Open in System PDF Viewer / New Tab"
          aria-label="Open PDF in Fullscreen or External Viewer"
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-[11px] font-bold text-emerald-300 hover:text-white transition-all card-press-3d cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Open Fullscreen</span>
        </button>
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            title="Download PDF"
            aria-label="Download PDF"
            className="p-1 rounded-lg hover:bg-white/10 text-emerald-300 hover:text-white transition-all card-press-3d cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <p className="text-white text-xs sm:text-sm font-bold">Rendering Official PDF...</p>
            <p className="text-[11px] text-gray-400 mt-0.5">High-resolution offline canvas view</p>
          </div>
        </div>
      )}

      {/* Render Error / Native Fallback Card */}
      {!isLoading && renderError && (
        <div className="p-6 max-w-sm text-center space-y-3 bg-white/5 border border-emerald-500/30 rounded-2xl backdrop-blur-md shadow-xl m-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 mx-auto flex items-center justify-center shadow-inner">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-white font-black text-sm">Official PDF Ready</h4>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              {title || 'Official Ticket / Voucher Document'}
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleOpenExternal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md card-press-3d cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Native PDF Viewer</span>
            </button>
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 font-bold text-xs border border-white/10 card-press-3d cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF File</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden Fallback Stream for Background Printing & Compatibility */}
      <iframe
        src={blobUrl || (source.startsWith('http') || source.startsWith('/') ? source : undefined)}
        title={title}
        className="hidden pointer-events-none"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Canvas Viewport */}
      <div
        className={`w-full h-full overflow-auto p-2 sm:p-4 flex items-center justify-center ${
          isLoading || renderError ? 'hidden' : ''
        }`}
      >
        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(15,91,68,0.25)] border border-emerald-500/20 bg-white transition-transform duration-200"
        />
      </div>

      {/* Bottom Floating Multi-Page Pagination Bar */}
      {!isLoading && !renderError && numPages > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30 text-white text-xs shadow-xl">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            title="Previous Page"
            aria-label="Previous Page"
            className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30 cursor-pointer transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono font-bold text-[11px] text-emerald-300 px-1">
            {currentPage} / {numPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            title="Next Page"
            aria-label="Next Page"
            className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30 cursor-pointer transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
