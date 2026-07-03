// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import videosRouter from './routes/videos.js';
import compression from 'compression';

dotenv.config();

const app = express();

app.use(
	compression({
		filter: (req, res) => {
			if (req.headers['x-no-compression']) return false;
			return compression.filter(req, res);
		},
		level: 6,
		threshold: 1024,
	}),
);

app.use(express.json({ limit: '10mb' }));

// CORS - allow any vercel.app origin + localhost
app.use((req, res, next) => {
	const origin = req.headers.origin || '';

	const isAllowed =
		!origin ||
		origin.includes('vercel.app') ||
		origin.startsWith('http://localhost') ||
		origin.startsWith('http://127.0.0.1');

	if (isAllowed) {
		res.header('Access-Control-Allow-Origin', origin || '*');
	}

	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.header(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, X-Requested-With',
	);
	res.header('Access-Control-Allow-Credentials', 'true');
	res.header('Access-Control-Max-Age', '86400');

	if (req.method === 'GET') {
		res.header('Cache-Control', 'public, max-age=300');
	}

	if (req.method === 'OPTIONS') {
		return res.sendStatus(204);
	}

	next();
});

// Security Headers
app.use((req, res, next) => {
	const SUPABASE_URL =
		process.env.SUPABASE_URL || 'https://ipvjwhonnzwclllrljrx.supabase.co';

	res.setHeader(
		'Content-Security-Policy',
		`default-src 'self'; ` +
			`script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://www.google-analytics.com; ` +
			`style-src 'self' 'unsafe-inline'; ` +
			`img-src 'self' data: https: blob:; ` +
			`media-src 'self' ${SUPABASE_URL} blob:; ` +
			`connect-src 'self' ${SUPABASE_URL} https://www.google-analytics.com https://*.vercel.app; ` +
			`font-src 'self' data:; ` +
			`frame-src 'self' https://www.google.com; ` +
			`object-src 'none'; ` +
			`base-uri 'self';`,
	);

	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'SAMEORIGIN');

	next();
});

if (process.env.NODE_ENV !== 'production') {
	app.use((req, _res, next) => {
		console.log(`[REQ] ${req.method} ${req.url}`);
		next();
	});
}

app.get('/health', (_req, res) => {
	res.setHeader('Cache-Control', 'public, max-age=60');
	res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api/videos', videosRouter);

app.use((_req, res) => {
	res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
	console.error('Unhandled error:', err?.message);
	res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production') {
	const PORT = Number(process.env.PORT || 3000);
	app.listen(PORT, () => {
		console.log(`Server listening on http://localhost:${PORT}`);
	});
}

export default app;
