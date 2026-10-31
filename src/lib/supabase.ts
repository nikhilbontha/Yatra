import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';

declare global {
  // eslint-disable-next-line no-var
  var __yatra_supabase_client__: SupabaseClient | null | undefined;
  // eslint-disable-next-line no-var
  var __yatra_supabase_url__: string | undefined;
  // eslint-disable-next-line no-var
  var __yatra_supabase_key__: string | undefined;
}

/**
 * Validation helpers for Supabase connection parameters
 */
export function isValidSupabaseUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidSupabaseKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.length < 10) return false;
  // Security guardrail: Never allow service_role key in client-side code
  if (trimmed.toLowerCase().includes('service_role')) return false;
  return true;
}

/**
 * Get or initialize the single shared Supabase client instance.
 * Persists across hot-reloads and renders to prevent multiple GoTrueClient warnings.
 */
export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url = (
    customUrl ||
    (typeof window !== 'undefined' ? localStorage.getItem('yatra_supabase_url') : null) ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();

  // Support modern publishable key with fallback to legacy anon key
  const key = (
    customKey ||
    (typeof window !== 'undefined' ? localStorage.getItem('yatra_supabase_key') : null) ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!url || !key) {
    return null;
  }

  // Validate URL protocol
  if (!isValidSupabaseUrl(url)) {
    console.warn('Invalid Supabase URL: Must start with https:// or http://');
    return null;
  }

  // Validate Key
  if (!isValidSupabaseKey(key)) {
    console.error('Invalid Supabase Key: Key is malformed or contains forbidden service_role tokens');
    return null;
  }

  // Return the existing client if credentials match
  if (
    globalThis.__yatra_supabase_client__ &&
    globalThis.__yatra_supabase_url__ === url &&
    globalThis.__yatra_supabase_key__ === key
  ) {
    return globalThis.__yatra_supabase_client__;
  }

  try {
    const client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });

    globalThis.__yatra_supabase_client__ = client;
    globalThis.__yatra_supabase_url__ = url;
    globalThis.__yatra_supabase_key__ = key;

    return client;
  } catch (e) {
    console.error('Failed to initialize Supabase client:', e);
    return null;
  }
}

export function resetSupabaseClientInstance(): void {
  globalThis.__yatra_supabase_client__ = null;
  globalThis.__yatra_supabase_url__ = undefined;
  globalThis.__yatra_supabase_key__ = undefined;
}

/**
 * Safely retrieve the current session using getSession()
 */
export async function getPersistedSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      console.warn('Error reading Supabase session:', error.message);
      return null;
    }
    return session;
  } catch (err) {
    console.warn('Unexpected error reading Supabase session:', err);
    return null;
  }
}

/**
 * Check if cloud sync is configured with valid URL & Key
 */
export function isCloudConfigured(): boolean {
  return getSupabaseClient() !== null;
}

/**
 * Storage Helpers for private document vault
 */
export const BUCKET_NAME = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'trip-documents';

export async function uploadDocumentFile(userId: string, file: File, docId: string): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cloud storage not configured. File stored locally.');

  const ext = file.name.split('.').pop() || 'bin';
  const filePath = `${userId}/${docId}.${ext}`;

  const { error } = await client.storage.from(BUCKET_NAME).upload(filePath, file, {
    upsert: true,
  });

  if (error) throw error;
  return filePath;
}

export async function getSignedFileUrl(storagePath: string, expiresInSeconds: number = 900): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cloud storage not configured');

  const { data, error } = await client.storage.from(BUCKET_NAME).createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw error || new Error('Could not generate signed URL');
  }

  return data.signedUrl;
}

export async function deleteStorageFile(storagePath: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  await client.storage.from(BUCKET_NAME).remove([storagePath]);
}
