// frontend/src/App.jsx (OPTIMIZED)
import React, {
	useCallback,
	useEffect,
	useMemo,
	useState,
	lazy,
	Suspense,
} from 'react';
import { fetchVideos } from './api/client.js';
import VideoGrid from './components/VideoGrid.jsx';
import CalendarView from './components/CalendarView.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';

// Lazy load heavy components
const PlaylistsView = lazy(() => import('./components/PlaylistsView.jsx'));
const PlaylistDetailView = lazy(() =>
	import('./components/PlaylistDetailView.jsx')
);
const WatchLaterView = lazy(() => import('./components/WatchLaterView.jsx'));

// Loading component
const LoadingFallback = () => (
	<div className="flex items-center justify-center p-12">
		<div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
	</div>
);

const RECENT_VIDEOS_COUNT = 9;

// Parse filename - memoized
const parseMeta = (() => {
	const cache = new Map();
	return (filename) => {
		if (cache.has(filename)) return cache.get(filename);

		const name = filename.replace(/\.[^.]+$/, '');
		const m = name.match(/^(\d+)[-](\d{1,2})[._-](\d{1,2})[._-](\d{4})-(.+)$/);

		const result = m
			? {
					index: Number(m[1]),
					isoDate: `${m[4]}-${String(m[3]).padStart(2, '0')}-${String(
						m[2]
					).padStart(2, '0')}`,
					lesson: m[5].trim(),
			  }
			: null;

		cache.set(filename, result);
		return result;
	};
})();

function formatIsoToTR(isoDate) {
	if (!isoDate) return '';
	const [y, m, d] = isoDate.split('-');
	return `${d}/${m}/${y}`;
}

export default function App() {
	const [videos, setVideos] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [selectedDate, setSelectedDate] = useState('');
	const [selectedVideo, setSelectedVideo] = useState(null);
	const [selectedMeta, setSelectedMeta] = useState(null);
	const [gridColumns, setGridColumns] = useState(3);
	const [cinemaMode, setCinemaMode] = useState(false);
	const [currentView, setCurrentView] = useState('home');
	const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);

	const load = useCallback(async () => {
		try {
			setLoading(true);
			setError('');
			const rows = await fetchVideos();
			console.log('[App] fetched videos:', rows);
			setVideos(rows);
		} catch (e) {
			setError(String(e?.message || 'Videolar yüklenemedi'));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	// Calendar marks - memoized with useMemo
	const datesWithVideos = useMemo(() => {
		const set = new Set();
		videos.forEach((v) => {
			const meta = parseMeta(v.filename);
			if (meta) set.add(meta.isoDate);
		});
		return set;
	}, [videos]);

	// Lessons for selected date - memoized
	const lessonsForSelectedDate = useMemo(() => {
		if (!selectedDate) return [];
		const list = [];
		videos.forEach((v) => {
			const meta = parseMeta(v.filename);
			if (meta && meta.isoDate === selectedDate) {
				list.push({
					index: meta.index,
					lesson: meta.lesson,
					dateIso: meta.isoDate,
					video: v,
				});
			}
		});
		list.sort((a, b) => a.index - b.index);
		return list;
	}, [videos, selectedDate]);

	// Recent videos - memoized
	const recentVideos = useMemo(() => {
		if (!videos.length) return [];
		const sorted = [...videos].sort((a, b) => {
			const dateA = new Date(a['created-at']);
			const dateB = new Date(b['created-at']);
			return dateB - dateA;
		});
		return sorted.slice(0, RECENT_VIDEOS_COUNT);
	}, [videos]);

	const shouldHideRightPanel =
		selectedDate && lessonsForSelectedDate.length === 0;

	// Callbacks - memoized
	const openLesson = useCallback((entry) => {
		setSelectedVideo(entry.video);
		setSelectedMeta({
			lesson: entry.lesson,
			index: isFinite(entry.index) ? entry.index : undefined,
			dateIso: entry.dateIso,
		});
	}, []);

	const handleVideoClick = useCallback((video, meta) => {
		setSelectedVideo(video);
		setSelectedMeta({
			lesson: meta?.lesson || 'Ders',
			index: meta?.index,
			dateIso: meta?.isoDate,
		});
	}, []);

	const closePlayer = useCallback(() => {
		setSelectedVideo(null);
		setSelectedMeta(null);
		setCinemaMode(false);
	}, []);

	const handlePlaylistsClick = useCallback(() => {
		setCurrentView('playlists');
		setSelectedVideo(null);
		setSelectedMeta(null);
	}, []);

	const handleWatchLaterClick = useCallback(() => {
		setCurrentView('watch-later');
		setSelectedVideo(null);
		setSelectedMeta(null);
	}, []);

	const handleBackToHome = useCallback(() => {
		setCurrentView('home');
		setSelectedPlaylistId(null);
		setSelectedVideo(null);
		setSelectedMeta(null);
		setCinemaMode(false);
	}, []);

	const handleSelectPlaylist = useCallback((playlist) => {
		setSelectedPlaylistId(playlist.id);
		setCurrentView('playlist-detail');
	}, []);

	const handleDateSelect = useCallback((d) => {
		console.log('[App] date selected', d);
		setSelectedDate(d);
		setSelectedVideo(null);
		setSelectedMeta(null);
	}, []);

	const toggleCinemaMode = useCallback(() => {
		setCinemaMode((prev) => !prev);
	}, []);

	// Display videos - memoized
	const displayVideos = useMemo(() => {
		if (selectedDate) {
			return lessonsForSelectedDate.map((e) => e.video);
		}
		return recentVideos;
	}, [selectedDate, lessonsForSelectedDate, recentVideos]);

	// Navigation functions
	const sourceVideos = useMemo(
		() =>
			selectedDate
				? lessonsForSelectedDate
				: recentVideos.map((v) => ({ video: v })),
		[selectedDate, lessonsForSelectedDate, recentVideos]
	);

	const currentVideoIndex = useMemo(() => {
		if (!selectedVideo) return -1;
		return sourceVideos.findIndex(
			(e) => (e.video || e)['optimized-url'] === selectedVideo['optimized-url']
		);
	}, [selectedVideo, sourceVideos]);

	const handleNextVideo = useCallback(() => {
		if (currentVideoIndex < sourceVideos.length - 1) {
			const nextItem = sourceVideos[currentVideoIndex + 1];
			const nextVideo = nextItem.video || nextItem;
			const meta = parseMeta(nextVideo.filename);
			setSelectedVideo(nextVideo);
			setSelectedMeta({
				lesson: meta?.lesson || 'Ders',
				index: meta?.index,
				dateIso: meta?.isoDate,
			});
		}
	}, [currentVideoIndex, sourceVideos]);

	const handlePreviousVideo = useCallback(() => {
		if (currentVideoIndex > 0) {
			const prevItem = sourceVideos[currentVideoIndex - 1];
			const prevVideo = prevItem.video || prevItem;
			const meta = parseMeta(prevVideo.filename);
			setSelectedVideo(prevVideo);
			setSelectedMeta({
				lesson: meta?.lesson || 'Ders',
				index: meta?.index,
				dateIso: meta?.isoDate,
			});
		}
	}, [currentVideoIndex, sourceVideos]);

	const getNextVideo = useCallback(() => {
		if (currentVideoIndex < sourceVideos.length - 1) {
			const nextItem = sourceVideos[currentVideoIndex + 1];
			return nextItem.video || nextItem;
		}
		return null;
	}, [currentVideoIndex, sourceVideos]);

	const getPreviousVideo = useCallback(() => {
		if (currentVideoIndex > 0) {
			const prevItem = sourceVideos[currentVideoIndex - 1];
			return prevItem.video || prevItem;
		}
		return null;
	}, [currentVideoIndex, sourceVideos]);

	// Render main content
	const renderMainContent = () => {
		if (currentView === 'playlists') {
			return (
				<Suspense fallback={<LoadingFallback />}>
					<PlaylistsView onSelectPlaylist={handleSelectPlaylist} />
				</Suspense>
			);
		}

		if (currentView === 'playlist-detail' && selectedPlaylistId) {
			return (
				<Suspense fallback={<LoadingFallback />}>
					<PlaylistDetailView playlistId={selectedPlaylistId} />
				</Suspense>
			);
		}

		if (currentView === 'watch-later') {
			return (
				<Suspense fallback={<LoadingFallback />}>
					<WatchLaterView />
				</Suspense>
			);
		}

		// Home view
		if (cinemaMode) {
			return (
				<div className="space-y-6">
					<div className="w-full">
						{selectedVideo ? (
							<div className="bg-white rounded shadow p-3">
								<VideoPlayer
									src={selectedVideo['optimized-url']}
									title={selectedMeta?.lesson || 'Ders'}
									subtitle={`${
										selectedMeta?.index ? `${selectedMeta.index}. Ders • ` : ''
									}${formatIsoToTR(selectedMeta?.dateIso || '')}`}
									onClose={closePlayer}
									cinemaMode={cinemaMode}
									onCinemaModeToggle={toggleCinemaMode}
									onNext={handleNextVideo}
									onPrevious={handlePreviousVideo}
									nextVideo={getNextVideo()}
									previousVideo={getPreviousVideo()}
								/>
							</div>
						) : (
							<div className="bg-white rounded shadow p-6 text-sm text-gray-600">
								Video seçin
							</div>
						)}
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div className="space-y-4">
							<CalendarView
								datesWithVideos={datesWithVideos}
								onSelect={handleDateSelect}
							/>
							{selectedDate && (
								<div className="bg-white rounded shadow p-3">
									<div className="font-semibold mb-2">
										{formatIsoToTR(selectedDate)}
									</div>
									{lessonsForSelectedDate.length === 0 ? (
										<div className="text-sm text-gray-600">
											Bu tarihte video yok
										</div>
									) : (
										<div className="grid grid-cols-1 gap-2">
											{lessonsForSelectedDate.map((e, i) => (
												<button
													key={i}
													onClick={() => openLesson(e)}
													className="px-3 py-2 rounded border bg-gray-50 hover:bg-gray-100 text-left"
												>
													<div className="font-medium">{e.lesson}</div>
													<div className="text-xs text-gray-600">
														{isFinite(e.index) ? `${e.index}. Ders` : 'Ders'} •{' '}
														{formatIsoToTR(e.dateIso)}
													</div>
												</button>
											))}
										</div>
									)}
								</div>
							)}
						</div>

						<div>
							{shouldHideRightPanel ? (
								<div className="bg-white rounded shadow p-6 text-sm text-gray-600">
									Seçtiğiniz tarihte video yok.
								</div>
							) : (
								<VideoGrid
									videos={displayVideos}
									onVideoClick={handleVideoClick}
									gridColumns={gridColumns}
									onGridColumnsChange={setGridColumns}
								/>
							)}
						</div>
					</div>
				</div>
			);
		}

		// Normal mode
		return (
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-1 space-y-4">
					<CalendarView
						datesWithVideos={datesWithVideos}
						onSelect={handleDateSelect}
					/>
					{selectedDate && (
						<div className="bg-white rounded shadow p-3">
							<div className="font-semibold mb-2">
								{formatIsoToTR(selectedDate)}
							</div>
							{lessonsForSelectedDate.length === 0 ? (
								<div className="text-sm text-gray-600">
									Bu tarihte video yok
								</div>
							) : (
								<div className="grid grid-cols-1 gap-2">
									{lessonsForSelectedDate.map((e, i) => (
										<button
											key={i}
											onClick={() => openLesson(e)}
											className="px-3 py-2 rounded border bg-gray-50 hover:bg-gray-100 text-left"
										>
											<div className="font-medium">{e.lesson}</div>
											<div className="text-xs text-gray-600">
												{isFinite(e.index) ? `${e.index}. Ders` : 'Ders'} •{' '}
												{formatIsoToTR(e.dateIso)}
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					)}
				</div>

				<div className="lg:col-span-2">
					{shouldHideRightPanel ? (
						<div className="bg-white rounded shadow p-6 text-sm text-gray-600">
							Seçtiğiniz tarihte video yok.
						</div>
					) : selectedVideo ? (
						<div className="bg-white rounded shadow p-3">
							<VideoPlayer
								src={selectedVideo['optimized-url']}
								title={selectedMeta?.lesson || 'Ders'}
								subtitle={`${
									selectedMeta?.index ? `${selectedMeta.index}. Ders • ` : ''
								}${formatIsoToTR(selectedMeta?.dateIso || '')}`}
								onClose={closePlayer}
								cinemaMode={cinemaMode}
								onCinemaModeToggle={toggleCinemaMode}
								onNext={handleNextVideo}
								onPrevious={handlePreviousVideo}
								nextVideo={getNextVideo()}
								previousVideo={getPreviousVideo()}
							/>
						</div>
					) : (
						<VideoGrid
							videos={displayVideos}
							onVideoClick={handleVideoClick}
							gridColumns={gridColumns}
							onGridColumnsChange={setGridColumns}
						/>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-gray-100">
			<div className="max-w-6xl mx-auto p-4 space-y-6">
				{/* Header */}
				<header className="bg-white rounded-2xl shadow-md px-6 py-6 border border-gray-100">
					<div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6">
						<div className="text-center sm:text-left space-y-2">
							<h1 className="text-3xl font-bold text-gray-800 tracking-tight">
								Okul Yanımda
							</h1>
							<p className="text-base sm:text-xl text-gray-600">
								Projeyi Yapanlar:{' '}
								<span className="text-gray-900 font-semibold">Mecit ÇAĞAN</span>{' '}
								—{' '}
								<span className="text-gray-900 font-semibold">
									Ender KARAHANLI
								</span>
							</p>
							<p className="text-base sm:text-xl text-gray-600">
								Danışman Öğretmen:{' '}
								<span className="text-gray-900 font-semibold">İnan ÖZBEK</span>
							</p>
						</div>

						<div className="text-center sm:text-right text-gray-500 leading-tight sm:self-center">
							<p className="text-base sm:text-lg font-medium">
								Borusan Asım Kocabıyık MTAL
							</p>
							<p className="text-base sm:text-lg">
								Bilişim Teknolojileri Alanı
							</p>
						</div>
					</div>
				</header>

				{/* Navigation */}
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<h2 className="text-xl font-semibold text-gray-800">
						{currentView === 'home' &&
							!selectedDate &&
							`En Son Yüklenen ${RECENT_VIDEOS_COUNT} Video`}
						{currentView === 'home' && selectedDate && 'Video Yönetimi'}
						{currentView === 'playlists' && 'Playlistlerim'}
						{currentView === 'playlist-detail' && 'Playlist Detayı'}
						{currentView === 'watch-later' && 'Daha Sonra İzle'}
					</h2>
					<div className="flex items-center gap-2">
						{currentView !== 'home' && (
							<button
								onClick={handleBackToHome}
								className="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600"
							>
								Ana Sayfaya Dön
							</button>
						)}
						{currentView === 'home' && (
							<>
								<button
									onClick={handleWatchLaterClick}
									className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
								>
									Daha Sonra İzle
								</button>
								<button
									onClick={handlePlaylistsClick}
									className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
								>
									Playlistlerimi Göster
								</button>
							</>
						)}
						<button
							onClick={load}
							className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
							disabled={loading}
						>
							{loading ? 'Yükleniyor...' : 'Yenile'}
						</button>
					</div>
				</div>

				{error && <div className="text-red-600 text-sm">{error}</div>}

				{/* Main Content */}
				{renderMainContent()}
			</div>
		</div>
	);
}
