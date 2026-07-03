// frontend/src/components/VideoGrid.jsx (OPTIMIZED)
import React, {
	useState,
	useRef,
	useEffect,
	memo,
	useMemo,
	useCallback,
} from 'react';
import PlaylistManager from './PlaylistManager.jsx';
import Toast from './Toast.jsx';
import { addToWatchLater } from '../api/playlistStorage.js';
import { getProgress } from '../api/videoProgress.js';

// ── Thumbnail Cache + Generator ──────────────────────────────────────────────
// Canvas ile videonun ortasından bir frame yakalar, data URL olarak cache'ler.
// Aynı URL için ikinci kez istek atmaz — component unmount/remount edilse bile.

const thumbCache = new Map(); // url → dataURL
const thumbPending = new Map(); // url → Promise<dataURL>

const THUMB_MAX = 3;
let thumbActive = 0;
const thumbQueue = [];

function nextInQueue() {
	if (thumbActive >= THUMB_MAX || thumbQueue.length === 0) return;
	thumbActive++;
	const run = thumbQueue.shift();
	run();
}

function captureFrame(videoUrl) {
	if (thumbCache.has(videoUrl))
		return Promise.resolve(thumbCache.get(videoUrl));
	if (thumbPending.has(videoUrl)) return thumbPending.get(videoUrl);

	const promise = new Promise((resolve) => {
		thumbQueue.push(() => {
			const video = document.createElement('video');
			video.crossOrigin = 'anonymous';
			video.muted = true;
			video.playsInline = true;
			video.preload = 'metadata';

			let settled = false;
			const cleanup = (dataUrl) => {
				if (settled) return;
				settled = true;
				video.src = '';
				video.load();
				thumbPending.delete(videoUrl);
				thumbActive--;
				nextInQueue();
				resolve(dataUrl);
			};

			video.addEventListener(
				'loadedmetadata',
				() => {
					video.currentTime =
						isFinite(video.duration) && video.duration > 2
							? video.duration * 0.4
							: 1;
				},
				{ once: true },
			);

			video.addEventListener(
				'seeked',
				() => {
					try {
						const canvas = document.createElement('canvas');
						canvas.width = 320;
						canvas.height = 180;
						const ctx = canvas.getContext('2d');
						ctx.drawImage(video, 0, 0, 320, 180);
						const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
						thumbCache.set(videoUrl, dataUrl);
						cleanup(dataUrl);
					} catch {
						cleanup(null);
					}
				},
				{ once: true },
			);

			video.addEventListener('error', () => cleanup(null), { once: true });

			// 8 saniye timeout — takılı kalan videoları serbest bırak
			const timeout = setTimeout(() => cleanup(null), 8000);
			video.addEventListener('seeked', () => clearTimeout(timeout), {
				once: true,
			});
			video.addEventListener('error', () => clearTimeout(timeout), {
				once: true,
			});

			video.src = videoUrl;
			video.load();
		});
		nextInQueue();
	});

	thumbPending.set(videoUrl, promise);
	return promise;
}
// ─────────────────────────────────────────────────────────────────────────────

function parseMeta(filename) {
	if (!filename) return null;
	const name = filename.replace(/\.[^.]+$/, '');
	const m = name.match(/^(\d+)[-](\d{1,2})[._-](\d{1,2})[._-](\d{4})-(.+)$/);
	if (!m) return null;
	const index = Number(m[1]);
	const dd = String(m[2]).padStart(2, '0');
	const mm = String(m[3]).padStart(2, '0');
	const yyyy = m[4];
	const lesson = m[5].trim();
	const isoDate = `${yyyy}-${mm}-${dd}`;
	return { index, isoDate, lesson };
}

function formatIsoToTR(isoDate) {
	if (!isoDate) return '';
	const [y, m, d] = isoDate.split('-');
	return `${d}/${m}/${y}`;
}

// Lazy loading için intersection observer hook - optimize edilmiş
function useIntersectionObserver(ref, options = {}) {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
					// Bir kez görüldükten sonra observer'ı disconnect et (performans)
					observer.disconnect();
				}
			},
			{
				threshold: 0.01, // Daha erken başlat
				rootMargin: '100px', // Daha geniş margin
				...options,
			},
		);

		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return isVisible;
}

// Video thumbnail component - MEMO ile optimize edilmiş
const VideoThumbnail = memo(
	({
		video,
		meta,
		onVideoClick,
		onAddToPlaylist,
		onAddToWatchLater,
		progress,
	}) => {
		const cardRef = useRef(null);
		const isVisible = useIntersectionObserver(cardRef);
		const [thumbSrc, setThumbSrc] = useState(
			() => thumbCache.get(video['optimized-url']) || null,
		);

		const title = useMemo(() => meta?.lesson || 'Ders', [meta?.lesson]);
		const dateIso = useMemo(
			() =>
				meta?.isoDate ||
				(() => {
					try {
						return new Date(video['created-at']).toISOString().slice(0, 10);
					} catch {
						return '';
					}
				})(),
			[meta?.isoDate, video],
		);

		const subtitle = useMemo(
			() =>
				`${meta?.index ? `${meta.index}. Ders • ` : ''}${formatIsoToTR(
					dateIso,
				)}`,
			[meta?.index, dateIso],
		);

		const progressPercentage = useMemo(
			() => (progress ? progress.percentage : 0),
			[progress],
		);

		// Viewport'a girince canvas ile frame yakala (cache'de yoksa)
		useEffect(() => {
			if (!isVisible || thumbSrc) return;
			let cancelled = false;
			captureFrame(video['optimized-url']).then((dataUrl) => {
				if (!cancelled && dataUrl) setThumbSrc(dataUrl);
			});
			return () => {
				cancelled = true;
			};
		}, [isVisible]);

		// Callback'leri memoize et
		const handleClick = useCallback(() => {
			onVideoClick && onVideoClick(video, meta);
		}, [onVideoClick, video, meta]);

		const handleAddToPlaylist = useCallback(
			(e) => {
				e.stopPropagation();
				onAddToPlaylist(video, e);
			},
			[onAddToPlaylist, video],
		);

		const handleAddToWatchLater = useCallback(
			(e) => {
				e.stopPropagation();
				onAddToWatchLater(video, e);
			},
			[onAddToWatchLater, video],
		);

		return (
			<div
				ref={cardRef}
				className="bg-white rounded shadow overflow-hidden hover:shadow-lg transition cursor-pointer group relative"
				onClick={handleClick}
			>
				{/* Action buttons */}
				<div className="absolute top-2 right-2 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition">
					<button
						onClick={handleAddToWatchLater}
						className="p-2 bg-black/80 hover:bg-black rounded text-white transition"
						title="Daha sonra izle"
						aria-label="Daha sonra izle"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</button>

					<button
						onClick={handleAddToPlaylist}
						className="p-2 bg-black/80 hover:bg-black rounded text-white transition"
						title="Playlist'e ekle"
						aria-label="Playlist'e ekle"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4v16m8-8H4"
							/>
						</svg>
					</button>
				</div>

				<div className="relative aspect-video bg-gray-900 overflow-hidden">
					{/* Shimmer skeleton */}
					{!thumbSrc && <div className="absolute inset-0 shimmer-thumb" />}

					{/* Canvas frame — cache'den gelir, smooth fade-in */}
					<img
						src={thumbSrc || ''}
						alt={title}
						className="w-full h-full object-cover transition-opacity duration-500"
						style={{ opacity: thumbSrc ? 1 : 0 }}
						draggable={false}
					/>

					{/* Progress bar */}
					{progressPercentage > 0 && (
						<div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
							<div
								className="h-full bg-red-600"
								style={{ width: `${progressPercentage}%` }}
							/>
						</div>
					)}

					{/* Play Overlay - sadece hover olunca */}
					<div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
						<div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
							<svg
								className="w-12 h-12 text-white"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path d="M8 5v14l11-7z" />
							</svg>
						</div>
					</div>
				</div>

				<div className="p-3">
					<div className="text-sm font-medium truncate text-gray-800">
						{title}
					</div>
					<div className="text-xs text-gray-600">{subtitle}</div>
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		return (
			prevProps.video['optimized-url'] === nextProps.video['optimized-url'] &&
			prevProps.progress?.percentage === nextProps.progress?.percentage
		);
	},
);

VideoThumbnail.displayName = 'VideoThumbnail';

// Ana component - memo ile optimize edilmiş
const VideoGrid = memo(
	({ videos, onVideoClick, gridColumns = 3, onGridColumnsChange }) => {
		const [showPlaylistModal, setShowPlaylistModal] = useState(false);
		const [selectedVideoForPlaylist, setSelectedVideoForPlaylist] =
			useState(null);
		const [toastMessage, setToastMessage] = useState(null);

		const gridColsClass = useMemo(
			() =>
				({
					1: 'grid-cols-1',
					2: 'grid-cols-1 sm:grid-cols-2',
					3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
				})[gridColumns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
			[gridColumns],
		);

		const handleAddToPlaylist = useCallback((video, e) => {
			e.stopPropagation();
			setSelectedVideoForPlaylist(video);
			setShowPlaylistModal(true);
		}, []);

		const handleAddToWatchLater = useCallback((video, e) => {
			e.stopPropagation();
			addToWatchLater(video);
			setToastMessage('Daha sonra izle listesine eklendi');
		}, []);

		const handleCloseModal = useCallback(() => {
			setShowPlaylistModal(false);
			setSelectedVideoForPlaylist(null);
		}, []);

		const handlePlaylistSuccess = useCallback(() => {
			setToastMessage("Playlist'e eklendi");
		}, []);

		const handleCloseToast = useCallback(() => {
			setToastMessage(null);
		}, []);

		// Grid column handlers
		const handleSetColumns1 = useCallback(() => {
			onGridColumnsChange && onGridColumnsChange(1);
		}, [onGridColumnsChange]);

		const handleSetColumns2 = useCallback(() => {
			onGridColumnsChange && onGridColumnsChange(2);
		}, [onGridColumnsChange]);

		const handleSetColumns3 = useCallback(() => {
			onGridColumnsChange && onGridColumnsChange(3);
		}, [onGridColumnsChange]);

		return (
			<>
				<div className="bg-white rounded shadow p-4">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-800">
							Videolar ({videos.length})
						</h3>

						<div className="flex items-center gap-2 bg-gray-100 rounded p-1">
							<button
								onClick={handleSetColumns1}
								className={`p-2 rounded transition ${
									gridColumns === 1
										? 'bg-white shadow text-blue-600'
										: 'text-gray-600 hover:text-gray-900'
								}`}
								title="1 sütun"
								aria-label="1 sütun görünümü"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<rect
										x="4"
										y="4"
										width="16"
										height="16"
										strokeWidth="2"
										rx="2"
									/>
								</svg>
							</button>

							<button
								onClick={handleSetColumns2}
								className={`p-2 rounded transition ${
									gridColumns === 2
										? 'bg-white shadow text-blue-600'
										: 'text-gray-600 hover:text-gray-900'
								}`}
								title="2 sütun"
								aria-label="2 sütun görünümü"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<rect
										x="4"
										y="4"
										width="6"
										height="16"
										strokeWidth="2"
										rx="1"
									/>
									<rect
										x="14"
										y="4"
										width="6"
										height="16"
										strokeWidth="2"
										rx="1"
									/>
								</svg>
							</button>

							<button
								onClick={handleSetColumns3}
								className={`p-2 rounded transition ${
									gridColumns === 3
										? 'bg-white shadow text-blue-600'
										: 'text-gray-600 hover:text-gray-900'
								}`}
								title="3 sütun"
								aria-label="3 sütun görünümü"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<rect
										x="4"
										y="4"
										width="4"
										height="16"
										strokeWidth="2"
										rx="1"
									/>
									<rect
										x="10"
										y="4"
										width="4"
										height="16"
										strokeWidth="2"
										rx="1"
									/>
									<rect
										x="16"
										y="4"
										width="4"
										height="16"
										strokeWidth="2"
										rx="1"
									/>
								</svg>
							</button>
						</div>
					</div>

					<div className={`grid ${gridColsClass} gap-6`}>
						{videos.map((v, idx) => {
							const meta = parseMeta(v.filename);
							const progress = getProgress(v['optimized-url']);

							return (
								<VideoThumbnail
									key={v['optimized-url'] || idx}
									video={v}
									meta={meta}
									progress={progress}
									onVideoClick={onVideoClick}
									onAddToPlaylist={handleAddToPlaylist}
									onAddToWatchLater={handleAddToWatchLater}
									gridColumns={gridColumns}
								/>
							);
						})}
					</div>

					{videos.length === 0 && (
						<div className="text-center py-12 text-gray-500">
							Bu tarihte video bulunamadı
						</div>
					)}
				</div>

				{showPlaylistModal && selectedVideoForPlaylist && (
					<PlaylistManager
						video={selectedVideoForPlaylist}
						onSuccess={handlePlaylistSuccess}
						onClose={handleCloseModal}
					/>
				)}

				{toastMessage && (
					<Toast
						message={toastMessage}
						type="success"
						onClose={handleCloseToast}
					/>
				)}
			</>
		);
	},
);

VideoGrid.displayName = 'VideoGrid';

export default VideoGrid;
