/**
 * Universal RFC 4122 v4 UUID generator that works in all environments:
 * - Localhost (Secure context)
 * - LAN IP addresses like http://192.168.x.x (Insecure context where crypto.randomUUID is undefined)
 * - Web Workers & Service Workers
 * - Node.js SSR
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if blocked
    }
  }

  // RFC 4122 v4 compliant fallback for non-secure contexts (e.g. mobile Wi-Fi IP access)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
