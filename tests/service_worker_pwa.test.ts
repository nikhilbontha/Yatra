import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import manifest from '@/app/manifest';

describe('Phase I-7B: Service Worker Hardening & Offline PWA Asset Audit', () => {
  const rootDir = process.cwd();
  const swPath = path.join(rootDir, 'public', 'sw.js');
  const swContent = fs.readFileSync(swPath, 'utf8');

  // ----------------------------------------------------------------------------
  // 1. Service Worker Source & Required Precache Paths
  // ----------------------------------------------------------------------------
  describe('1. Static Precache Configuration in sw.js', () => {
    it('defines the hardened cache version name (yatra-shell-v3)', () => {
      expect(swContent).toMatch(/CACHE_NAME\s*=\s*['"]yatra-shell-v3['"]/);
    });

    it('contains all required core static assets in STATIC_ASSETS array', () => {
      const requiredAssets = [
        '/',
        '/manifest.webmanifest',
        '/favicon.ico',
        '/icons/icon-192.svg',
        '/icons/icon-512.svg',
        '/images/temple-hero.jpg',
      ];

      for (const asset of requiredAssets) {
        expect(swContent).toContain(`'${asset}'`);
      }
    });

    it('uses resilient Promise.allSettled or per-asset error catch during install', () => {
      expect(swContent).toMatch(/Promise\.allSettled/);
    });
  });

  // ----------------------------------------------------------------------------
  // 2. Local File Existence for Precached Assets
  // ----------------------------------------------------------------------------
  describe('2. Precached Local Assets Existence on Disk', () => {
    it('verifies favicon exists in app directory', () => {
      const faviconPath = path.join(rootDir, 'src', 'app', 'favicon.ico');
      expect(fs.existsSync(faviconPath)).toBe(true);
      expect(fs.statSync(faviconPath).size).toBeGreaterThan(0);
    });

    it('verifies 192x192 SVG icon exists on disk', () => {
      const iconPath = path.join(rootDir, 'public', 'icons', 'icon-192.svg');
      expect(fs.existsSync(iconPath)).toBe(true);
      expect(fs.statSync(iconPath).size).toBeGreaterThan(0);
    });

    it('verifies 512x512 SVG icon exists on disk', () => {
      const iconPath = path.join(rootDir, 'public', 'icons', 'icon-512.svg');
      expect(fs.existsSync(iconPath)).toBe(true);
      expect(fs.statSync(iconPath).size).toBeGreaterThan(0);
    });

    it('verifies temple-hero.jpg hero banner exists on disk', () => {
      const heroPath = path.join(rootDir, 'public', 'images', 'temple-hero.jpg');
      expect(fs.existsSync(heroPath)).toBe(true);
      expect(fs.statSync(heroPath).size).toBeGreaterThan(500000); // ~802 KB
    });

    it('verifies manifest source file exists in src/app', () => {
      const manifestPath = path.join(rootDir, 'src', 'app', 'manifest.ts');
      expect(fs.existsSync(manifestPath)).toBe(true);
    });
  });

  // ----------------------------------------------------------------------------
  // 3. Web App Manifest Metadata and Icon Paths
  // ----------------------------------------------------------------------------
  describe('3. Web App Manifest Structure & Validity', () => {
    const manifestData = manifest();

    it('defines valid application title and description', () => {
      expect(manifestData.name).toBe('Yatra — My Pilgrimage Planner');
      expect(manifestData.short_name).toBe('Yatra');
      expect(manifestData.description).toContain('Jyotirlinga pilgrimage');
    });

    it('configures standalone display and portrait orientation for mobile PWA', () => {
      expect(manifestData.start_url).toBe('/');
      expect(manifestData.display).toBe('standalone');
      expect(manifestData.orientation).toBe('portrait-primary');
      expect(manifestData.theme_color).toBe('#174b3e');
      expect(manifestData.background_color).toBe('#f6f7f3');
    });

    it('references existing icon files with correct sizes and types', () => {
      expect(Array.isArray(manifestData.icons)).toBe(true);
      expect(manifestData.icons!.length).toBeGreaterThanOrEqual(2);

      const icon192 = manifestData.icons!.find((i: any) => i.sizes === '192x192');
      expect(icon192).toBeDefined();
      expect(icon192!.src).toBe('/icons/icon-192.svg');
      const realPath192 = path.join(rootDir, 'public', icon192!.src);
      expect(fs.existsSync(realPath192)).toBe(true);

      const icon512 = manifestData.icons!.find((i: any) => i.sizes === '512x512');
      expect(icon512).toBeDefined();
      expect(icon512!.src).toBe('/icons/icon-512.svg');
      const realPath512 = path.join(rootDir, 'public', icon512!.src);
      expect(fs.existsSync(realPath512)).toBe(true);
    });
  });

  // ----------------------------------------------------------------------------
  // 4. Cache Versioning & Navigation Fallback
  // ----------------------------------------------------------------------------
  describe('4. Cache Lifecycle & Offline Navigation Fallback', () => {
    it('activates and prunes obsolete Yatra caches without deleting unrelated data', () => {
      expect(swContent).toContain("key.startsWith('yatra-')");
      expect(swContent).toContain('key !== CACHE_NAME');
      expect(swContent).toContain('caches.delete(key)');
      expect(swContent).toContain('self.clients.claim()');
    });

    it('contains offline fallback logic for navigation requests (page visits)', () => {
      expect(swContent).toContain("event.request.mode === 'navigate'");
      expect(swContent).toContain("caches.match('/')");
    });
  });

  // ----------------------------------------------------------------------------
  // 5. Strict Privacy & Mutation Protection
  // ----------------------------------------------------------------------------
  describe('5. Sensitive Endpoint & Mutation Exclusion', () => {
    it('explicitly skips non-GET requests (mutations like POST, PUT, DELETE)', () => {
      expect(swContent).toMatch(/event\.request\.method\s*!==\s*['"]GET['"]/);
    });

    it('strictly excludes private Supabase endpoints from caching', () => {
      expect(swContent).toContain("'/auth/'");
      expect(swContent).toContain("'/storage/v1/object/sign/'");
      expect(swContent).toContain("'/rest/v1/'");
      expect(swContent).toContain("'supabase.co'");
      expect(swContent).toContain("'/api/'");
    });

    it('excludes Next.js hot-module-reloading endpoints', () => {
      expect(swContent).toContain("'/_next/webpack-hmr'");
      expect(swContent).toContain("'/_next/hmr'");
    });
  });

  // ----------------------------------------------------------------------------
  // 6. Valid JavaScript Syntax
  // ----------------------------------------------------------------------------
  describe('6. Service Worker JavaScript Syntax Integrity', () => {
    it('parses as valid JavaScript without syntax errors', () => {
      expect(() => {
        // Compile the script in an isolated VM to verify AST syntax validity
        new vm.Script(swContent, { filename: 'public/sw.js' });
      }).not.toThrow();
    });
  });
});
