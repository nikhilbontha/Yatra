/**
 * Unified Attachment Helper for Pilgrimage Tickets & Accommodation Stays
 * Supports dual PDF Documents & High-Resolution Photo Scans / Images
 */

export interface AttachmentInfo {
  type: 'pdf' | 'image';
  source: string; // Data URI, remote URL, or blob path
  fileName?: string;
  fileSize?: string | number;
  fileType?: string;
}

export interface ItemAttachmentsStatus {
  hasPdf: boolean;
  hasImage: boolean;
  pdfInfo: AttachmentInfo | null;
  imageInfo: AttachmentInfo | null;
  hasAny: boolean;
  hasBoth: boolean;
}

export function formatFileSize(size?: number | string): string {
  if (!size) return '';
  if (typeof size === 'string') {
    if (size.toLowerCase().includes('kb') || size.toLowerCase().includes('mb')) return size;
    const parsed = parseFloat(size);
    if (isNaN(parsed)) return size;
    size = parsed;
  }
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function isPdfSource(source?: string, fileName?: string, fileType?: string): boolean {
  if (!source && !fileName && !fileType) return false;
  if (fileType === 'application/pdf') return true;
  if (fileName?.toLowerCase().endsWith('.pdf')) return true;
  if (source?.startsWith('data:application/pdf')) return true;
  if (source?.toLowerCase().endsWith('.pdf')) return true;
  return false;
}

export function isImageSource(source?: string, fileName?: string, fileType?: string): boolean {
  if (!source && !fileName && !fileType) return false;
  if (fileType?.startsWith('image/')) return true;
  if (fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i)) return true;
  if (source?.startsWith('data:image/')) return true;
  if (source?.match(/\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i)) return true;
  return false;
}

export function detectAttachmentAvailability(item: any): ItemAttachmentsStatus {
  if (!item) {
    return {
      hasPdf: false,
      hasImage: false,
      pdfInfo: null,
      imageInfo: null,
      hasAny: false,
      hasBoth: false,
    };
  }

  // 1. PDF Discovery
  let pdfInfo: AttachmentInfo | null = null;
  const directPdf = item.pdfBlob || item.pdfUrl;
  if (directPdf) {
    pdfInfo = {
      type: 'pdf',
      source: directPdf,
      fileName: item.pdfFileName || item.fileName || 'ticket_pass.pdf',
      fileSize: formatFileSize(item.pdfFileSize || item.fileSize),
      fileType: 'application/pdf',
    };
  } else if (item.blobData && isPdfSource(item.blobData, item.fileName, item.fileType)) {
    pdfInfo = {
      type: 'pdf',
      source: item.blobData,
      fileName: item.fileName || 'booking_document.pdf',
      fileSize: formatFileSize(item.fileSize),
      fileType: 'application/pdf',
    };
  } else if (item.documentUrl && isPdfSource(item.documentUrl, item.documentName, item.documentType)) {
    pdfInfo = {
      type: 'pdf',
      source: item.documentUrl,
      fileName: item.documentName || `${item.name || 'stay'}_voucher.pdf`,
      fileSize: formatFileSize(item.documentSize),
      fileType: 'application/pdf',
    };
  } else if (item.fileUrl && isPdfSource(item.fileUrl, item.fileName, item.fileType)) {
    pdfInfo = {
      type: 'pdf',
      source: item.fileUrl,
      fileName: item.fileName || 'ticket.pdf',
      fileSize: formatFileSize(item.fileSize),
      fileType: 'application/pdf',
    };
  } else if (item.fileName?.toLowerCase().endsWith('.pdf') && item.blobData) {
    pdfInfo = {
      type: 'pdf',
      source: item.blobData,
      fileName: item.fileName,
      fileSize: formatFileSize(item.fileSize),
      fileType: 'application/pdf',
    };
  }

  // 2. Image Discovery
  let imageInfo: AttachmentInfo | null = null;
  const directImage = item.imageBlob || (item.imageUrl && !item.imageUrl.includes('placeholder') && !item.imageUrl.startsWith('/images/shirdi-dharamshala.jpg') ? item.imageUrl : null);
  if (directImage) {
    imageInfo = {
      type: 'image',
      source: directImage,
      fileName: item.imageFileName || 'pass_photo.jpg',
      fileSize: formatFileSize(item.imageFileSize),
      fileType: 'image/jpeg',
    };
  } else if (item.blobData && isImageSource(item.blobData, item.fileName, item.fileType)) {
    imageInfo = {
      type: 'image',
      source: item.blobData,
      fileName: item.fileName || 'ticket_scan.jpg',
      fileSize: formatFileSize(item.fileSize),
      fileType: item.fileType || 'image/jpeg',
    };
  } else if (item.documentUrl && isImageSource(item.documentUrl, item.documentName, item.documentType)) {
    imageInfo = {
      type: 'image',
      source: item.documentUrl,
      fileName: item.documentName || 'stay_photo.jpg',
      fileSize: formatFileSize(item.documentSize),
      fileType: 'image/jpeg',
    };
  } else if (item.imageUrl && !item.imageUrl.includes('placeholder')) {
    // If standard image URL present
    imageInfo = {
      type: 'image',
      source: item.imageUrl,
      fileName: item.imageFileName || `${item.name || 'stay'}_photo.jpg`,
      fileSize: formatFileSize(item.imageFileSize),
      fileType: 'image/jpeg',
    };
  }

  const hasPdf = Boolean(pdfInfo?.source);
  const hasImage = Boolean(imageInfo?.source);

  return {
    hasPdf,
    hasImage,
    pdfInfo,
    imageInfo,
    hasAny: hasPdf || hasImage,
    hasBoth: hasPdf && hasImage,
  };
}

