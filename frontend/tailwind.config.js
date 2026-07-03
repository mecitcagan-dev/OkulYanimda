/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'], // ✅ 'purge' yerine 'content'
	theme: {
		extend: {
			animation: {
				spin: 'spin 0.8s linear infinite',
				pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'slide-up': 'slideUp 0.3s ease-out',
			},
			keyframes: {
				slideUp: {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' },
				},
			},
			transitionDuration: {
				150: '150ms',
				200: '200ms',
				300: '300ms',
			},
		},
	},
	plugins: [],
};
