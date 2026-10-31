import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentViewerModal } from '@/components/modals/DocumentViewerModal';
import { PdfCanvasViewer } from '@/components/modals/PdfCanvasViewer';
import fs from 'fs';
import path from 'path';

describe('PDF Mobile Canvas & Offline Images Verification Suite', () => {
  const samplePdfTicket = {
    id: 'test-ticket-irctc',
    title: 'hyd to shirdi',
    fileName: '4447190834.pdf',
    fileSize: '84.8 KB',
    fileType: 'application/pdf',
    pdfBlob: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2c...',
    pnr: '4447190834',
    travelDate: '2026-11-17',
  };

  it('1. DocumentViewerModal renders PdfCanvasViewer for PDF passes', () => {
    const html = renderToStaticMarkup(
      React.createElement(DocumentViewerModal, {
        isOpen: true,
        document: samplePdfTicket,
        initialMode: 'pdf',
        onClose: vi.fn(),
      })
    );

    // Header & metadata
    expect(html).toContain('hyd to shirdi');
    expect(html).toContain('4447190834.pdf');
    expect(html).toContain('84.8 KB');
    expect(html).toContain('PNR / Ref: 4447190834');

    // Controls
    expect(html).toContain('Open Fullscreen');
    expect(html).toContain('Download');
    expect(html).toContain('canvas');
  });

  it('2. PdfCanvasViewer component includes canvas, controls, and external viewer trigger', () => {
    const html = renderToStaticMarkup(
      React.createElement(PdfCanvasViewer, {
        source: samplePdfTicket.pdfBlob,
        title: 'hyd to shirdi',
        zoom: 1,
        rotation: 0,
        onDownload: vi.fn(),
      })
    );

    expect(html).toContain('canvas');
    expect(html).toContain('Open Fullscreen');
    expect(html).toContain('Download PDF');
    expect(html).toContain('iframe'); // hidden compatibility fallback
  });

  it('3. Service worker precaches all public images and pdf worker', () => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    const swContent = fs.readFileSync(swPath, 'utf8');

    expect(swContent).toContain('/pdf.worker.min.mjs');
    expect(swContent).toContain('/images/temple-hero.jpg');
    expect(swContent).toContain('/images/shirdi-dharamshala.jpg');
    expect(swContent).toContain('/images/sacred-temple-emblem.jpg');
    expect(swContent).toContain('/images/places/somnath-jyotirlinga.jpg');
    expect(swContent).toContain('isImageRequest');
  });

  it('4. Layout.tsx preserves Service Worker cache without deleting it on localhost or 192.168.x.x', () => {
    const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');

    expect(layoutContent).not.toContain('caches.delete');
    expect(layoutContent).toContain("navigator.serviceWorker.register('/sw.js')");
  });
});

