import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
	plugins: [
		react(),
		// Gzip compression
		viteCompression({
			verbose: true,
			disable: false,
			threshold: 10240,
			algorithm: 'gzip',
			ext: '.gz',
			deleteOriginFile: false,
		}),
		// Brotli compression
		viteCompression({
			verbose: true,
			disable: false,
			threshold: 10240,
			algorithm: 'brotliCompress',
			ext: '.br',
			deleteOriginFile: false,
		}),
	],

	build: {
		target: 'es2020',

		rollupOptions: {
			output: {
				manualChunks(id) {
					// React ve React-DOM her zaman önce yüklenen tek chunk'ta
					if (
						id.includes('node_modules/react/') ||
						id.includes('node_modules/react-dom/')
					) {
						return 'react-vendor';
					}
					// Diğer node_modules → vendor chunk
					if (id.includes('node_modules/')) {
						return 'vendor';
					}
					// Video bileşenleri
					if (
						id.includes('/components/VideoPlayer') ||
						id.includes('/components/VideoGrid')
					) {
						return 'video-components';
					}
					// Playlist bileşenleri
					if (
						id.includes('/components/PlaylistsView') ||
						id.includes('/components/PlaylistDetailView') ||
						id.includes('/components/PlaylistManager') ||
						id.includes('/components/WatchLaterView')
					) {
						return 'playlist-components';
					}
					// UI bileşenleri
					if (
						id.includes('/components/CalendarView') ||
						id.includes('/components/Toast')
					) {
						return 'ui-components';
					}
				},
				chunkFileNames: 'assets/js/[name]-[hash].js',
				entryFileNames: 'assets/js/[name]-[hash].js',
				assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
			},
		},

		// ✅ UPDATED: Terser configuration with better compatibility
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
				pure_funcs: [
					'console.log',
					'console.info',
					'console.debug',
					'console.trace',
				],
				passes: 2, // Reduced from 3 for faster builds
				dead_code: true,
				unused: true,
				conditionals: true,
				evaluate: true,
				booleans: true,
				loops: true,
				if_return: true,
				join_vars: true,
				collapse_vars: true,
				reduce_vars: true,
				warnings: false,
				side_effects: true,
			},
			mangle: {
				safari10: true,
				toplevel: true,
			},
			format: {
				comments: false,
				ecma: 2020,
			},
		},

		cssCodeSplit: true,
		cssMinify: true,
		sourcemap: false,
		reportCompressedSize: true,
		chunkSizeWarningLimit: 800,
		assetsInlineLimit: 4096,

		modulePreload: {
			polyfill: true,
		},

		outDir: 'dist',
		assetsDir: 'assets',
		emptyOutDir: true,
	},

	optimizeDeps: {
		include: ['react', 'react-dom'],
		exclude: [],
		force: false,
		esbuildOptions: {
			target: 'es2020',
			supported: {
				bigint: true,
			},
		},
	},

	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				secure: false,
			},
		},
		hmr: {
			overlay: false,
		},
		open: false,
		cors: true,
	},

	preview: {
		port: 4173,
		strictPort: true,
		open: false,
	},

	esbuild: {
		logOverride: { 'this-is-undefined-in-esm': 'silent' },
		legalComments: 'none',
		target: 'es2020',
	},
});
