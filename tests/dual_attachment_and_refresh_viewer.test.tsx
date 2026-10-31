import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ViewAttachmentChooserModal } from '@/components/modals/ViewAttachmentChooserModal';
import { DocumentViewerModal } from '@/components/modals/DocumentViewerModal';
import { TicketModal, StayModal } from '@/components/Modals';
import { detectAttachmentAvailability, formatFileSize } from '@/lib/attachment-helper';
import { BookingDocument, AccommodationStay } from '@/types/trip';

describe('Dual PDF & Image Support, 3D Popups, and Refresh Preservation Suite', () => {
  const sampleTicket: BookingDocument = {
    id: 'doc-ticket-irctc-1',
    tripId: '00000000-0000-4000-8000-000000000001',
    title: 'Secunderabad to Shirdi Train Ticket',
    docType: 'Train Ticket',
    pnr: '4447190834',
    bookingRef: '4447190834',
    travelDate: '2026-11-17',
    fileName: '4447190834.pdf',
    fileSize: 520 * 1024,
    pdfBlob: 'data:application/pdf;base64,JVBERi0xLjQK...',
    pdfFileName: '4447190834.pdf',
    pdfFileSize: 520 * 1024,
    imageBlob: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    imageFileName: 'train_pass_photo.jpg',
    imageFileSize: 310 * 1024,
    offlineCached: true,
    createdAt: '2026-10-31T00:00:00.000Z',
    updatedAt: '2026-10-31T00:00:00.000Z',
  };

  const sampleStay: AccommodationStay = {
    id: 'stay-shirdi-1',
    tripId: '00000000-0000-4000-8000-000000000001',
    name: 'Shree Sai Ashram Pilgrim Complex',
    stayType: 'Dharamshala',
    city: 'Shirdi',
    estimatedCost: 350,
    checkinDate: '2026-11-18',
    checkoutDate: '2026-11-19',
    bookingReference: 'ASHRAM-9872',
    pdfBlob: 'data:application/pdf;base64,JVBERi0xLjQK...',
    pdfFileName: 'ashram_voucher.pdf',
    pdfFileSize: '410 KB',
    imageBlob: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    imageFileName: 'room_receipt_photo.jpg',
    imageFileSize: '280 KB',
    createdAt: '2026-10-31T00:00:00.000Z',
    updatedAt: '2026-10-31T00:00:00.000Z',
  };

  it('1. Detects both PDF and Image availability cleanly on tickets and stays', () => {
    const ticketDetect = detectAttachmentAvailability(sampleTicket);
    expect(ticketDetect.hasPdf).toBe(true);
    expect(ticketDetect.hasImage).toBe(true);
    expect(ticketDetect.hasBoth).toBe(true);
    expect(ticketDetect.pdfInfo?.fileName).toBe('4447190834.pdf');
    expect(ticketDetect.imageInfo?.fileName).toBe('train_pass_photo.jpg');

    const stayDetect = detectAttachmentAvailability(sampleStay);
    expect(stayDetect.hasPdf).toBe(true);
    expect(stayDetect.hasImage).toBe(true);
    expect(stayDetect.hasBoth).toBe(true);
    expect(stayDetect.pdfInfo?.fileName).toBe('ashram_voucher.pdf');
    expect(stayDetect.imageInfo?.fileName).toBe('room_receipt_photo.jpg');
  });

  it('2. Formats file sizes accurately in B, KB, and MB', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024 * 350)).toBe('350.0 KB');
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
    expect(formatFileSize('450 KB')).toBe('450 KB');
  });

  it('3. Renders 3D ViewAttachmentChooserModal with both options when ticket has image & PDF', () => {
    const onSelectMode = vi.fn();
    const onClose = vi.fn();

    const html = renderToStaticMarkup(
      React.createElement(ViewAttachmentChooserModal, {
        isOpen: true,
        item: sampleTicket,
        itemType: 'ticket',
        onSelectMode,
        onClose,
      })
    );

    expect(html).toContain('Secunderabad to Shirdi Train Ticket');
    expect(html).toContain('Ref: 4447190834');
    expect(html).toContain('Pass Photo / Screenshot (Image)');
    expect(html).toContain('train_pass_photo.jpg');
    expect(html).toContain('View Image (3D Lightbox &amp; Zoom)');
    expect(html).toContain('Official PDF Document');
    expect(html).toContain('4447190834.pdf');
    expect(html).toContain('View PDF Document (Interactive)');
    expect(html).toContain('Stored in Private Offline Vault');
  });

  it('4. Renders 3D ViewAttachmentChooserModal with instant upload options when item has missing attachments', () => {
    const itemWithoutImage: BookingDocument = {
      ...sampleTicket,
      imageBlob: undefined,
      imageUrl: undefined,
      imageFileName: undefined,
    };

    const html = renderToStaticMarkup(
      React.createElement(ViewAttachmentChooserModal, {
        isOpen: true,
        item: itemWithoutImage,
        itemType: 'ticket',
        onSelectMode: vi.fn(),
        onClose: vi.fn(),
        onAttachFile: vi.fn(),
      })
    );

    expect(html).toContain('Not Attached');
    expect(html).toContain('+ Upload Pass Photo / Scan');
    expect(html).toContain('View PDF Document (Interactive)');
  });

  it('5. Renders 3D DocumentViewerModal with interactive mode switcher tabs', () => {
    const html = renderToStaticMarkup(
      React.createElement(DocumentViewerModal, {
        isOpen: true,
        document: sampleTicket,
        initialMode: 'image',
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Secunderabad to Shirdi Train Ticket');
    expect(html).toContain('Photo');
    expect(html).toContain('PDF');
    expect(html).toContain('train_pass_photo.jpg');
    expect(html).toContain('Zoom In');
    expect(html).toContain('Download');
    expect(html).toContain('Offline Encrypted');
  });

  it('6. Renders TicketModal with dedicated dual dropzones for PDF and Photo scan', () => {
    const html = renderToStaticMarkup(
      React.createElement(TicketModal, {
        initialData: sampleTicket,
        onSave: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Attach Document File (PDF or Photo, max 10MB)');
    expect(html).toContain('Official PDF Ticket');
    expect(html).toContain('4447190834.pdf');
    expect(html).toContain('Pass Photo / Scan');
    expect(html).toContain('train_pass_photo.jpg');
  });

  it('7. Renders StayModal with dual upload dropzones for Voucher PDF and Stay Photo', () => {
    const html = renderToStaticMarkup(
      React.createElement(StayModal, {
        isOpen: true,
        initialData: sampleStay,
        onSave: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Stay Attachments (Optional - Upload PDF Voucher &amp; Photo)');
    expect(html).toContain('Stay Voucher (PDF)');
    expect(html).toContain('ashram_voucher.pdf');
    expect(html).toContain('Stay Photo / Slip');
    expect(html).toContain('room_receipt_photo.jpg');
  });
});

