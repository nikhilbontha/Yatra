import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SyncFailureModal } from '@/components/modals/SyncFailureModal';
import { deleteSyncQueueItem } from '@/lib/db';

describe('Sync Failure Popup and Error Diagnostics Verification', () => {
  describe('1. SyncFailureModal Rendering & Diagnostics', () => {
    it('renders the failure modal with diagnostic tag and human-friendly explanation', () => {
      const html = renderToStaticMarkup(
        <SyncFailureModal
          isOpen={true}
          onClose={() => {}}
          onRetry={() => {}}
          onOpenInspector={() => {}}
          errorReason="new row violates row-level security policy for table expenses"
          technicalDetails="PostgreSQL error code 42501"
          failedItems={[
            {
              entity: 'expenses',
              action: 'delete',
              title: 'Expense: ₹50 Shirdi Auto',
              error: 'Delete on expenses failed: 42501 permission denied',
            },
          ]}
        />
      );

      // Verify title & diagnostic tag
      expect(html).toContain('Cloud Sync Failed');
      expect(html).toContain('Cloud Permissions');

      // Verify human friendly explanation
      expect(html).toContain('Row-level security policy restricted modifying this cloud record');

      // Verify failed operation is listed
      expect(html).toContain('Expense: ₹50 Shirdi Auto');
      expect(html).toContain('Delete on expenses failed: 42501 permission denied');
      expect(html).toContain('Retry Sync Now');
      expect(html).toContain('Open Sync Inspector');
    });

    it('identifies network / offline errors and displays proper advice', () => {
      const html = renderToStaticMarkup(
        <SyncFailureModal
          isOpen={true}
          onClose={() => {}}
          onRetry={() => {}}
          onOpenInspector={() => {}}
          errorReason="Failed to fetch: net::ERR_INTERNET_DISCONNECTED"
        />
      );

      expect(html).toContain('Network Connection');
      expect(html).toContain('Unable to reach the Supabase cloud server');
      expect(html).toContain('All changes remain safely preserved in your offline local database');
    });

    it('identifies authentication expiration and displays auth guidance', () => {
      const html = renderToStaticMarkup(
        <SyncFailureModal
          isOpen={true}
          onClose={() => {}}
          onRetry={() => {}}
          onOpenInspector={() => {}}
          errorReason="JWT expired or invalid claim in auth token"
        />
      );

      expect(html).toContain('Authentication Required');
      expect(html).toContain('Your Supabase cloud session has expired or requires sign-in');
    });

    it('identifies data link conflict / foreign key errors', () => {
      const html = renderToStaticMarkup(
        <SyncFailureModal
          isOpen={true}
          onClose={() => {}}
          onRetry={() => {}}
          onOpenInspector={() => {}}
          errorReason="insert or update on table expenses violates foreign key constraint 23503"
        />
      );

      expect(html).toContain('Data Link Conflict');
      expect(html).toContain('A referenced parent record (such as an itinerary day) does not exist in the cloud database');
    });

    it('renders nothing when isOpen is false', () => {
      const html = renderToStaticMarkup(
        <SyncFailureModal
          isOpen={false}
          onClose={() => {}}
          onRetry={() => {}}
          onOpenInspector={() => {}}
          errorReason="Some error"
        />
      );

      expect(html).toBe('');
    });
  });

  describe('2. Queue Item Removal Helper Existence', () => {
    it('exports deleteSyncQueueItem function from db', () => {
      expect(typeof deleteSyncQueueItem).toBe('function');
    });
  });
});
