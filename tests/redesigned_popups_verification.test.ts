import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Redesigned Popups & Modals Verification', () => {
  const srcDir = path.resolve(__dirname, '../src');

  function getAllFiles(dir: string, ext: string[]): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(fullPath, ext));
      } else {
        if (ext.some(e => file.endsWith(e))) {
          results.push(fullPath);
        }
      }
    });
    return results;
  }

  it('1. verifies ZERO native confirm() or alert() calls exist anywhere in src/', () => {
    const files = getAllFiles(srcDir, ['.ts', '.tsx']);
    const violations: { file: string; line: number; match: string }[] = [];

    const nativePattern = /\b(confirm|alert)\s*\(/;

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        // Exclude comments, imports, or variable definitions containing alert or confirm
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
        if (trimmed.includes('import ') || trimmed.includes('export type') || trimmed.includes('interface ')) return;
        if (trimmed.includes('AlertTriangle') || trimmed.includes('AlertCircle') || trimmed.includes('ShieldAlert')) return;
        if (trimmed.includes('ConfirmModal') || trimmed.includes('AlertModal') || trimmed.includes('AlertDialog') || trimmed.includes('ConfirmDialog')) return;
        if (trimmed.includes('confirmLabel') || trimmed.includes('confirmText') || trimmed.includes('confirmVariant')) return;

        if (nativePattern.test(line)) {
          violations.push({
            file: path.relative(srcDir, file),
            line: index + 1,
            match: trimmed,
          });
        }
      });
    });

    expect(violations).toEqual([]);
  });

  it('2. verifies ConfirmModal component exports with 3D glassmorphism & tactile buttons', () => {
    const modalPath = path.join(srcDir, 'components/modals/ConfirmModal.tsx');
    expect(fs.existsSync(modalPath)).toBe(true);
    const content = fs.readFileSync(modalPath, 'utf-8');
    expect(content).toContain('export const ConfirmModal');
    expect(content).toContain('backdrop-blur');
    expect(content).toContain('shadow-');
    expect(content).toContain('card-press-3d');
    expect(content).toContain('role="dialog"');
  });

  it('3. verifies AlertModal component exports with 3D glassmorphic styling', () => {
    const modalPath = path.join(srcDir, 'components/modals/AlertModal.tsx');
    expect(fs.existsSync(modalPath)).toBe(true);
    const content = fs.readFileSync(modalPath, 'utf-8');
    expect(content).toContain('export const AlertModal');
    expect(content).toContain('backdrop-blur');
    expect(content).toContain('shadow-');
    expect(content).toContain('card-press-3d');
    expect(content).toContain('role="dialog"');
  });

  it('4. verifies ModalWrapper in Modals.tsx has 3D glassmorphism and keyboard escape listener', () => {
    const modalPath = path.join(srcDir, 'components/Modals.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');
    expect(content).toContain('ModalWrapper');
    expect(content).toContain('Escape');
    expect(content).toContain('backdrop-blur');
    expect(content).toContain('shadow-');
  });

  it('5. verifies NotesView uses 3D ConfirmModal for note deletion', () => {
    const notesViewPath = path.join(srcDir, 'components/views/NotesView.tsx');
    const content = fs.readFileSync(notesViewPath, 'utf-8');
    expect(content).toContain('ConfirmModal');
    expect(content).toContain('noteToDelete');
    expect(content).not.toContain('confirm(`Are you sure you want to delete note');
  });

  it('6. verifies TransportView uses 3D ConfirmModal for journey deletion', () => {
    const transportViewPath = path.join(srcDir, 'components/views/TransportView.tsx');
    const content = fs.readFileSync(transportViewPath, 'utf-8');
    expect(content).toContain('ConfirmModal');
    expect(content).toContain('legToDelete');
    expect(content).not.toContain('confirm(\'Are you sure you want to delete this journey?\')');
  });

  it('7. verifies TicketsView uses 3D ConfirmModal & AlertModal', () => {
    const ticketsViewPath = path.join(srcDir, 'components/views/TicketsView.tsx');
    const content = fs.readFileSync(ticketsViewPath, 'utf-8');
    expect(content).toContain('ConfirmModal');
    expect(content).toContain('AlertModal');
    expect(content).toContain('ticketToDelete');
  });

  it('8. verifies DocumentsView uses 3D ConfirmModal & AlertModal', () => {
    const docViewPath = path.join(srcDir, 'components/views/DocumentsView.tsx');
    const content = fs.readFileSync(docViewPath, 'utf-8');
    expect(content).toContain('ConfirmModal');
    expect(content).toContain('AlertModal');
    expect(content).toContain('docToDelete');
  });

  it('9. verifies BudgetView uses 3D ConfirmModal & AlertModal', () => {
    const budgetViewPath = path.join(srcDir, 'components/views/BudgetView.tsx');
    const content = fs.readFileSync(budgetViewPath, 'utf-8');
    expect(content).toContain('ConfirmModal');
    expect(content).toContain('AlertModal');
    expect(content).toContain('expenseToDelete');
  });

  it('10. verifies SyncInspectorModal has 3D glassmorphic card styling & backdrop escape', () => {
    const syncModalPath = path.join(srcDir, 'components/modals/SyncInspectorModal.tsx');
    const content = fs.readFileSync(syncModalPath, 'utf-8');
    expect(content).toContain('Escape');
    expect(content).toContain('backdrop-blur');
    expect(content).toContain('shadow-');
  });
});

