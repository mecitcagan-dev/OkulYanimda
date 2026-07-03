import React, { useRef, useState, useEffect, useCallback } from 'react';
import { getProgress, saveProgress } from '../api/videoProgress.js';

function parseMeta(filename) {
	const name = filename.replace(/\.[^.]+$/, '');
	const m = name.match(/^(\d+)[-](\d{1,2})[._-](\d{1,2})[._-](\d{4})-(.+)$/);
	if (!m) return null;
	const index = Number(m[1]);
	const lesson = m[5].trim();
	return { index, lesson };
}

export default function VideoPlayer({
	src,
	title,
	subtitle,
	onClose,
	cinemaMode,
	onCinemaModeToggle,
	onNext,
	onPrevious,
	nextVideo,
	previousVideo,
}) {
	const videoRef = useRef(null);
	const containerRef = useRef(null);
	const progressBarRef = useRef(null);
	const controlsTimeoutRef = useRef(null);
	const lastTapRef = useRef(0);
	const isDraggingRef = useRef(false);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [hasRestoredProgress, setHasRestoredProgress] = useState(false);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [showControls, setShowControls] = useState(true);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showVolumeSlider, setShowVolumeSlider] = useState(false);
	const [showSpeedMenu, setShowSpeedMenu] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [buffered, setBuffered] = useState(0);
	const [isBuffering, setIsBuffering] = useState(false);

	// Detect mobile device
	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768);
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	// Video event handlers
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleLoadedMetadata = () => {
			setDuration(video.duration);
			setVolume(video.volume);
			if (!hasRestoredProgress) {
				const progress = getProgress(src);
				if (progress && progress.currentTime > 5) {
					video.currentTime = progress.currentTime;
					setCurrentTime(progress.currentTime);
				}
				setHasRestoredProgress(true);
			}
		};

		const handleTimeUpdate = () => {
			setCurrentTime(video.currentTime);
			if (video.buffered.length > 0) {
				const bufferedEnd = video.buffered.end(video.buffered.length - 1);
				setBuffered((bufferedEnd / video.duration) * 100);
			}
			if (video.currentTime % 5 < 0.5 && video.duration > 0) {
				saveProgress(src, video.currentTime, video.duration);
			}
		};

		const handlePlay = () => {
			setIsPlaying(true);
			setIsBuffering(false);
		};
		const handlePause = () => {
			setIsPlaying(false);
			if (video.duration > 0)
				saveProgress(src, video.currentTime, video.duration);
		};
		const handleWaiting = () => setIsBuffering(true);
		const handleCanPlay = () => setIsBuffering(false);

		video.addEventListener('loadedmetadata', handleLoadedMetadata);
		video.addEventListener('timeupdate', handleTimeUpdate);
		video.addEventListener('play', handlePlay);
		video.addEventListener('pause', handlePause);
		video.addEventListener('waiting', handleWaiting);
		video.addEventListener('canplay', handleCanPlay);

		return () => {
			if (video.duration > 0)
				saveProgress(src, video.currentTime, video.duration);
			video.removeEventListener('loadedmetadata', handleLoadedMetadata);
			video.removeEventListener('timeupdate', handleTimeUpdate);
			video.removeEventListener('play', handlePlay);
			video.removeEventListener('pause', handlePause);
			video.removeEventListener('waiting', handleWaiting);
			video.removeEventListener('canplay', handleCanPlay);
		};
	}, [src, hasRestoredProgress]);

	// Keyboard shortcuts (desktop only)
	useEffect(() => {
		if (isMobile) return;
		const handleKeyPress = (e) => {
			const video = videoRef.current;
			if (!video) return;
			switch (e.key) {
				case ' ':
					e.preventDefault();
					togglePlayPause();
					break;
				case 'ArrowRight':
					e.preventDefault();
					skipForward();
					break;
				case 'ArrowLeft':
					e.preventDefault();
					skipBackward();
					break;
				case 'ArrowUp':
					e.preventDefault();
					const up = Math.min(volume + 0.1, 1);
					setVolume(up);
					video.volume = up;
					setIsMuted(false);
					break;
				case 'ArrowDown':
					e.preventDefault();
					const down = Math.max(volume - 0.1, 0);
					setVolume(down);
					video.volume = down;
					if (down === 0) setIsMuted(true);
					break;
				case 'm':
				case 'M':
					e.preventDefault();
					toggleMute();
					break;
				case 'f':
				case 'F':
					e.preventDefault();
					toggleFullscreen();
					break;
				default:
					break;
			}
		};
		window.addEventListener('keydown', handleKeyPress);
		return () => window.removeEventListener('keydown', handleKeyPress);
	}, [volume, duration, isMobile]);

	// Auto-hide controls
	const resetControlsTimeout = useCallback(() => {
		setShowControls(true);
		if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
		if (!isMobile && isPlaying) {
			controlsTimeoutRef.current = setTimeout(
				() => setShowControls(false),
				3000,
			);
		}
	}, [isMobile, isPlaying]);

	useEffect(() => {
		if (isMobile) {
			setShowControls(true);
		} else {
			resetControlsTimeout();
		}
		return () => {
			if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
		};
	}, [isPlaying, isMobile]);

	// Fullscreen change handler
	useEffect(() => {
		const handleFullscreenChange = () =>
			setIsFullscreen(!!document.fullscreenElement);
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () =>
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
	}, []);

	const togglePlayPause = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		video.paused ? video.play() : video.pause();
	}, []);

	const skipBackward = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		video.currentTime = Math.max(video.currentTime - 10, 0);
	}, []);

	const skipForward = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		video.currentTime = Math.min(video.currentTime + 10, duration);
	}, [duration]);

	// ── Progress bar: seek on click or drag ──────────────────────────────────
	const seekToPosition = useCallback(
		(clientX) => {
			const video = videoRef.current;
			const bar = progressBarRef.current;
			if (!video || !bar) return;
			const rect = bar.getBoundingClientRect();
			const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
			video.currentTime = pos * duration;
		},
		[duration],
	);

	const handleSeekClick = useCallback(
		(e) => {
			e.stopPropagation();
			seekToPosition(e.clientX);
		},
		[seekToPosition],
	);

	// Touch seek support for mobile progress bar
	const handleSeekTouchStart = useCallback(
		(e) => {
			e.stopPropagation();
			isDraggingRef.current = true;
			seekToPosition(e.touches[0].clientX);
		},
		[seekToPosition],
	);

	const handleSeekTouchMove = useCallback(
		(e) => {
			if (!isDraggingRef.current) return;
			e.stopPropagation();
			seekToPosition(e.touches[0].clientX);
		},
		[seekToPosition],
	);

	const handleSeekTouchEnd = useCallback((e) => {
		e.stopPropagation();
		isDraggingRef.current = false;
	}, []);

	const handleVolumeChange = (e) => {
		const newVolume = parseFloat(e.target.value);
		setVolume(newVolume);
		videoRef.current.volume = newVolume;
		setIsMuted(newVolume === 0);
	};

	const toggleMute = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		if (isMuted) {
			video.volume = volume || 0.5;
			setVolume(volume || 0.5);
			setIsMuted(false);
		} else {
			video.volume = 0;
			setIsMuted(true);
		}
	}, [isMuted, volume]);

	const changePlaybackRate = (rate) => {
		const video = videoRef.current;
		if (!video) return;
		video.playbackRate = rate;
		setPlaybackRate(rate);
		setShowSpeedMenu(false);
	};

	const toggleFullscreen = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;
		if (!document.fullscreenElement) container.requestFullscreen();
		else document.exitFullscreen();
	}, []);

	const formatTime = (seconds) => {
		if (!seconds || isNaN(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

	// ── Overlay click: toggle play/pause when clicking the non-control area ──
	const handleOverlayClick = useCallback(
		(e) => {
			// Only fire if the click target IS the overlay itself (not a child control)
			if (e.target === e.currentTarget) {
				if (isMobile) return; // mobile handled by touch
				togglePlayPause();
			}
		},
		[isMobile, togglePlayPause],
	);

	// ── Mobile tap/double-tap on the video area ───────────────────────────────
	const handleMobileTap = useCallback(
		(e) => {
			// Don't handle taps that originated from control elements
			const tag = e.target.tagName;
			if (tag === 'BUTTON' || tag === 'INPUT' || e.target.closest('button'))
				return;

			resetControlsTimeout();
			const now = Date.now();
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;
			const touchX = e.changedTouches?.[0]?.clientX ?? e.clientX;
			const isLeftSide = touchX - rect.left < rect.width / 2;

			if (now - lastTapRef.current < 300) {
				// Double tap
				isLeftSide ? skipBackward() : skipForward();
			} else {
				togglePlayPause();
			}
			lastTapRef.current = now;
		},
		[resetControlsTimeout, skipBackward, skipForward, togglePlayPause],
	);

	return (
		<div
			ref={containerRef}
			className={`relative bg-black rounded-lg overflow-hidden select-none ${
				isFullscreen ? 'fixed inset-0 z-50' : ''
			} ${cinemaMode ? 'col-span-full' : ''}`}
			onMouseMove={!isMobile ? resetControlsTimeout : undefined}
			onMouseLeave={
				!isMobile ? () => isPlaying && setShowControls(false) : undefined
			}
		>
			{/* ── Raw Video Element (no click handler here) ── */}
			<video
				ref={videoRef}
				src={src}
				className={`w-full block ${
					isFullscreen
						? 'h-screen object-contain'
						: cinemaMode
							? 'h-auto max-h-[85vh]'
							: isMobile
								? 'h-auto max-h-[50vh]'
								: 'h-auto max-h-[70vh]'
				}`}
				playsInline
				webkit-playsinline="true"
			>
				<track kind="captions" label="Türkçe" srcLang="tr" />
			</video>

			{/* ── Full-screen interactive overlay ─────────────────────────────────
			    This sits on top of the video. Clicking the transparent area
			    toggles play/pause. Controls stop event propagation so they don't
			    also trigger the toggle.
			────────────────────────────────────────────────────────────────────── */}
			<div
				className="absolute inset-0"
				onClick={handleOverlayClick}
				onTouchEnd={isMobile ? handleMobileTap : undefined}
			>
				{/* Gradient (visual only, no pointer events) */}
				<div
					className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/50
						transition-opacity duration-300 pointer-events-none ${
							showControls ? 'opacity-100' : 'opacity-0'
						}`}
				/>

				{/* Buffering Spinner */}
				{isBuffering && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
					</div>
				)}

				{/* ── Center Play Button ───────────────────────────────────────────
				    Lives INSIDE the overlay so it's above the gradient and
				    receives pointer events correctly. stopPropagation prevents
				    the overlay's own onClick from double-toggling.
				─────────────────────────────────────────────────────────────────── */}
				{!isPlaying && !isBuffering && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<button
							onClick={(e) => {
								e.stopPropagation();
								togglePlayPause();
							}}
							className="bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-6 transition-all
								duration-150 pointer-events-auto hover:scale-110 active:scale-95"
							aria-label="Oynat"
						>
							<svg
								className="w-16 h-16 text-white"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path d="M8 5v14l11-7z" />
							</svg>
						</button>
					</div>
				)}

				{/* ── Top Bar ──────────────────────────────────────────────────────
				    stopPropagation: clicking here should NOT toggle play/pause
				─────────────────────────────────────────────────────────────────── */}
				<div
					className={`absolute top-0 inset-x-0 transition-opacity duration-300 ${
						showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
					}`}
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex items-center justify-between p-3 md:p-4">
						<div className="flex-1 min-w-0 pr-3">
							<h3 className="text-white font-semibold text-sm md:text-base truncate">
								{title}
							</h3>
							{subtitle && (
								<p className="text-gray-300 text-xs md:text-sm truncate">
									{subtitle}
								</p>
							)}
						</div>
						<div className="flex items-center gap-2 flex-shrink-0">
							{onCinemaModeToggle && !isFullscreen && !isMobile && (
								<button
									onClick={onCinemaModeToggle}
									className="text-white hover:bg-white/20 rounded-full p-2 transition"
									aria-label={cinemaMode ? 'Normal mod' : 'Sinema modu'}
								>
									<svg
										className="w-6 h-6"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										{cinemaMode ? (
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
											/>
										) : (
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
											/>
										)}
									</svg>
								</button>
							)}
							{onClose && !isFullscreen && (
								<button
									onClick={onClose}
									className="text-white hover:bg-white/20 rounded-full p-2 transition"
									aria-label="Kapat"
								>
									<svg
										className="w-6 h-6"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							)}
						</div>
					</div>
				</div>

				{/* ── Bottom Controls ───────────────────────────────────────────────
				    stopPropagation: clicking controls should NOT toggle play/pause
				─────────────────────────────────────────────────────────────────── */}
				<div
					className={`absolute bottom-0 inset-x-0 transition-opacity duration-300 ${
						showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
					}`}
					onClick={(e) => e.stopPropagation()}
				>
					<div className="px-3 pb-3 md:px-4 md:pb-4 space-y-1">
						{/* ── Progress Bar ─────────────────────────────────────────────
						    Outer div has generous vertical padding (py-3) so the
						    hitbox is ~28px tall — like YouTube — while the visual
						    bar stays thin. On hover the bar grows to h-3 and a
						    thumb dot appears.
						─────────────────────────────────────────────────────────────── */}
						<div
							ref={progressBarRef}
							className="w-full py-3 cursor-pointer group"
							onClick={handleSeekClick}
							onTouchStart={handleSeekTouchStart}
							onTouchMove={handleSeekTouchMove}
							onTouchEnd={handleSeekTouchEnd}
						>
							<div
								className="relative w-full h-1 group-hover:h-3 bg-white/30 rounded-full
								transition-all duration-150"
							>
								{/* Buffered track */}
								<div
									className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
									style={{ width: `${buffered}%` }}
								/>
								{/* Played track */}
								<div
									className="absolute inset-y-0 left-0 bg-red-500 rounded-full"
									style={{ width: `${progressPercentage}%` }}
								>
									{/* Scrubber thumb dot */}
									<div
										className="absolute right-0 top-1/2 -translate-y-1/2
										w-0 h-0 group-hover:w-4 group-hover:h-4
										bg-white rounded-full shadow-lg
										transition-all duration-150 -translate-x-1/2"
									/>
								</div>
							</div>
						</div>

						{/* Controls Row */}
						<div className="flex items-center justify-between text-white">
							{/* Left Side */}
							<div className="flex items-center gap-1 md:gap-2">
								{/* Play/Pause */}
								<button
									onClick={(e) => {
										e.stopPropagation();
										togglePlayPause();
									}}
									className="hover:bg-white/20 rounded-full p-2 transition"
									aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
								>
									{isPlaying ? (
										<svg
											className="w-6 h-6 md:w-7 md:h-7"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
										</svg>
									) : (
										<svg
											className="w-6 h-6 md:w-7 md:h-7"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path d="M8 5v14l11-7z" />
										</svg>
									)}
								</button>

								{/* Previous (desktop only) */}
								{!isMobile && previousVideo && onPrevious && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											onPrevious();
										}}
										className="hover:bg-white/20 rounded-full p-2 transition"
										aria-label="Önceki video"
									>
										<svg
											className="w-6 h-6"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
										</svg>
									</button>
								)}

								{/* Next (desktop only) */}
								{!isMobile && nextVideo && onNext && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											onNext();
										}}
										className="hover:bg-white/20 rounded-full p-2 transition"
										aria-label="Sonraki video"
									>
										<svg
											className="w-6 h-6"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
										</svg>
									</button>
								)}

								{/* Skip back 10s */}
								<button
									onClick={(e) => {
										e.stopPropagation();
										skipBackward();
									}}
									className="hover:bg-white/20 rounded-full p-2 transition"
									aria-label="-10 saniye"
								>
									<svg
										className="w-5 h-5"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path d="M12.5 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z" />
										<path d="M12.5 3L8.5 7h4V3z" />
										<text
											x="7"
											y="15"
											fontSize="7"
											fontFamily="sans-serif"
											fill="currentColor"
										>
											10
										</text>
									</svg>
								</button>

								{/* Skip forward 10s */}
								<button
									onClick={(e) => {
										e.stopPropagation();
										skipForward();
									}}
									className="hover:bg-white/20 rounded-full p-2 transition"
									aria-label="+10 saniye"
								>
									<svg
										className="w-5 h-5"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path d="M11.5 3a9 9 0 1 1-9 9h2a7 7 0 1 0 7-7V3z" />
										<path d="M11.5 3l4 4h-4V3z" />
										<text
											x="7"
											y="15"
											fontSize="7"
											fontFamily="sans-serif"
											fill="currentColor"
										>
											10
										</text>
									</svg>
								</button>

								{/* Volume (desktop only) */}
								{!isMobile && (
									<div
										className="relative flex items-center gap-2"
										onMouseEnter={() => setShowVolumeSlider(true)}
										onMouseLeave={() => setShowVolumeSlider(false)}
									>
										<button
											onClick={(e) => {
												e.stopPropagation();
												toggleMute();
											}}
											className="hover:bg-white/20 rounded-full p-2 transition"
											aria-label={isMuted ? 'Sesi aç' : 'Sessiz'}
										>
											{isMuted || volume === 0 ? (
												<svg
													className="w-6 h-6"
													fill="currentColor"
													viewBox="0 0 24 24"
												>
													<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
												</svg>
											) : (
												<svg
													className="w-6 h-6"
													fill="currentColor"
													viewBox="0 0 24 24"
												>
													<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
												</svg>
											)}
										</button>
										<div
											className={`transition-all duration-200 ${
												showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'
											} overflow-hidden`}
										>
											<input
												type="range"
												min="0"
												max="1"
												step="0.05"
												value={isMuted ? 0 : volume}
												onChange={handleVolumeChange}
												className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer
													[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
													[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white
													[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
											/>
										</div>
									</div>
								)}

								{/* Time */}
								<span className="text-xs md:text-sm font-mono whitespace-nowrap px-1">
									{formatTime(currentTime)} / {formatTime(duration)}
								</span>
							</div>

							{/* Right Side */}
							<div className="flex items-center gap-1 md:gap-2">
								{/* Playback Speed */}
								<div className="relative">
									<button
										onClick={(e) => {
											e.stopPropagation();
											setShowSpeedMenu(!showSpeedMenu);
										}}
										className="hover:bg-white/20 rounded px-2 py-1 transition text-sm font-semibold min-w-[40px] text-center"
										aria-label="Oynatma hızı"
									>
										{playbackRate}x
									</button>
									{showSpeedMenu && (
										<>
											<div
												className="fixed inset-0 z-40"
												onClick={() => setShowSpeedMenu(false)}
											/>
											<div className="absolute bottom-full right-0 mb-2 bg-black/95 rounded-lg shadow-xl overflow-hidden z-50 min-w-[120px]">
												<div className="py-1">
													{[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(
														(rate) => (
															<button
																key={rate}
																onClick={() => changePlaybackRate(rate)}
																className={`block w-full px-4 py-2 text-left text-sm hover:bg-white/20 transition ${
																	playbackRate === rate
																		? 'bg-white/10 text-red-500'
																		: 'text-white'
																}`}
															>
																{rate === 1 ? 'Normal' : `${rate}x`}
															</button>
														),
													)}
												</div>
											</div>
										</>
									)}
								</div>

								{/* Fullscreen */}
								<button
									onClick={(e) => {
										e.stopPropagation();
										toggleFullscreen();
									}}
									className="hover:bg-white/20 rounded-full p-2 transition"
									aria-label={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
								>
									{isFullscreen ? (
										<svg
											className="w-6 h-6"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
										</svg>
									) : (
										<svg
											className="w-6 h-6"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
										</svg>
									)}
								</button>
							</div>
						</div>

						{/* Mobile Navigation */}
						{isMobile && (previousVideo || nextVideo) && (
							<div className="flex items-center gap-2 pt-2 border-t border-white/20">
								{previousVideo && onPrevious && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											onPrevious();
										}}
										className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
										aria-label="Önceki video"
									>
										<svg
											className="w-5 h-5"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
										</svg>
										<span className="text-sm truncate">Önceki</span>
									</button>
								)}
								{nextVideo && onNext && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											onNext();
										}}
										className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
										aria-label="Sonraki video"
									>
										<span className="text-sm truncate">Sonraki</span>
										<svg
											className="w-5 h-5"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
										</svg>
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
