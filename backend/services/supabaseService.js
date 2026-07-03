// backend/services/supabaseService.js
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) console.warn('SUPABASE_URL is not set.');
if (!SUPABASE_SERVICE_KEY) console.warn('SUPABASE_SERVICE_KEY is not set.');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
	auth: { persistSession: false },
});

export function buildPublicUrl(remoteName) {
	return `${SUPABASE_URL}/storage/v1/object/public/videos/${encodeURIComponent(remoteName)}`;
}

export async function objectExistsInBucket(remoteName) {
	const { data, error } = await supabase.storage
		.from('videos')
		.list('', { search: remoteName, limit: 1 });
	if (error) throw new Error(`List storage failed: ${error.message}`);
	return Array.isArray(data) && data.some((o) => o.name === remoteName);
}

export async function findByPublicUrl(publicUrl) {
	const { data, error } = await supabase
		.from('videos')
		.select('*')
		.eq('optimized_url', publicUrl)
		.limit(1);
	if (error) throw new Error(`Find by URL failed: ${error.message}`);
	return Array.isArray(data) && data.length ? data[0] : null;
}

export async function uploadFileToBucket(localPath, remoteName) {
	if (!localPath || !remoteName)
		throw new Error('uploadFileToBucket requires localPath and remoteName');

	const already = await objectExistsInBucket(remoteName);
	if (already) return buildPublicUrl(remoteName);

	const fileBuffer = await fs.promises.readFile(localPath);

	const { error } = await supabase.storage
		.from('videos')
		.upload(remoteName, fileBuffer, {
			contentType: 'video/webm',
			upsert: false,
		});

	if (error) {
		if (
			String(error.message || '')
				.toLowerCase()
				.includes('exists')
		)
			return buildPublicUrl(remoteName);
		throw new Error(`Supabase upload failed: ${error.message}`);
	}

	return buildPublicUrl(remoteName);
}

export async function insertMetadata({ filename, created_at, optimized_url }) {
	if (!filename || !created_at || !optimized_url)
		throw new Error(
			'insertMetadata requires filename, created_at, optimized_url',
		);

	const payload = {
		filename,
		created_at: new Date(created_at).toISOString(),
		optimized_url,
	};

	const { data, error } = await supabase
		.from('videos')
		.insert(payload)
		.select()
		.single();
	if (error) throw new Error(`Insert metadata failed: ${error.message}`);
	return data;
}

export async function getVideos({ date } = {}) {
	let query = supabase.from('videos').select('*');

	if (date) {
		const start = new Date(`${date}T00:00:00.000Z`).toISOString();
		const end = new Date(`${date}T23:59:59.999Z`).toISOString();
		query = query.gte('created_at', start).lte('created_at', end);
	}

	query = query.order('created_at', { ascending: false });

	const { data, error } = await query;
	if (error) throw new Error(`Fetch videos failed: ${error.message}`);
	return data ?? [];
}

export default {
	uploadFileToBucket,
	insertMetadata,
	getVideos,
	buildPublicUrl,
	findByPublicUrl,
	objectExistsInBucket,
};
