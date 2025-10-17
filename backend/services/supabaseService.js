// backend/services/supabaseService.js
// Purpose: Provide Supabase Storage and Postgres helpers for uploading videos and managing metadata.
// Usage: import { uploadFileToBucket, insertMetadata, getVideos, buildPublicUrl, findByPublicUrl, objectExistsInBucket } from './supabaseService.js'

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.warn('SUPABASE_URL is not set. Some operations may fail.');
}
if (!SUPABASE_SERVICE_KEY) {
  console.warn('SUPABASE_SERVICE_KEY is not set. Write operations will fail.');
}

// Single server-side client using service role key (never expose to frontend)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

export function buildPublicUrl(remoteName) {
  return `${SUPABASE_URL}/storage/v1/object/public/videos/${encodeURIComponent(remoteName)}`;
}

/**
 * Checks if an object named remoteName already exists in the storage bucket.
 * @param {string} remoteName
 * @returns {Promise<boolean>}
 */
export async function objectExistsInBucket(remoteName) {
  const { data, error } = await supabase.storage.from('videos').list('', { search: remoteName, limit: 1 });
  if (error) throw new Error(`List storage failed: ${error.message}`);
  return Array.isArray(data) && data.some((o) => o.name === remoteName);
}

/**
 * Checks if a row with the given public URL already exists.
 * @param {string} publicUrl
 * @returns {Promise<any|null>}
 */
export async function findByPublicUrl(publicUrl) {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('optimized_url', publicUrl)
    .limit(1);
  if (error) {
    throw new Error(`Find by URL failed: ${error.message}`);
  }
  return Array.isArray(data) && data.length ? data[0] : null;
}

/**
 * Uploads a local file to the `videos` storage bucket and returns a public URL.
 * Uses Buffer to avoid Node fetch duplex requirement for streams.
 *
 * @param {string} localPath - Absolute path to local file to upload.
 * @param {string} remoteName - Remote object key (e.g., '2025-10-16_xyz-video.webm').
 * @returns {Promise<string>} - Public URL of uploaded file.
 */
export async function uploadFileToBucket(localPath, remoteName) {
  if (!localPath || !remoteName) {
    throw new Error('uploadFileToBucket requires localPath and remoteName');
  }

  // If already exists, just return the URL
  const already = await objectExistsInBucket(remoteName);
  if (already) {
    return buildPublicUrl(remoteName);
  }

  const fileBuffer = await fs.promises.readFile(localPath);

  const { error } = await supabase.storage
    .from('videos')
    .upload(remoteName, fileBuffer, {
      contentType: 'video/webm',
      upsert: false,
    });

  if (error) {
    // If conflict, treat as exists
    if (String(error.message || '').toLowerCase().includes('exists')) {
      return buildPublicUrl(remoteName);
    }
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return buildPublicUrl(remoteName);
}

/**
 * Inserts a row into the videos table.
 *
 * @param {{ filename: string, created_at: string|Date, optimized_url: string }} row
 * @returns {Promise<any>} - Inserted row
 */
export async function insertMetadata({ filename, created_at, optimized_url }) {
  if (!filename || !created_at || !optimized_url) {
    throw new Error('insertMetadata requires filename, created_at, optimized_url');
  }
  const payload = {
    filename,
    created_at: new Date(created_at).toISOString(),
    optimized_url,
  };

  const { data, error } = await supabase.from('videos').insert(payload).select().single();
  if (error) {
    throw new Error(`Insert metadata failed: ${error.message}`);
  }
  return data;
}

/**
 * Fetches video rows, optionally filtered by date (YYYY-MM-DD), sorted by created_at desc.
 *
 * @param {{ date?: string }} params
 * @returns {Promise<Array<any>>}
 */
export async function getVideos({ date } = {}) {
  let query = supabase.from('videos').select('*');

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`).toISOString();
    const end = new Date(`${date}T23:59:59.999Z`).toISOString();
    query = query.gte('created_at', start).lte('created_at', end);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    throw new Error(`Fetch videos failed: ${error.message}`);
  }
  return data ?? [];
}

export default { uploadFileToBucket, insertMetadata, getVideos, buildPublicUrl, findByPublicUrl, objectExistsInBucket };
