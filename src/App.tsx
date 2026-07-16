import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Flame, 
  ArrowLeft, 
  ChevronRight, 
  Tv, 
  BookOpen, 
  History, 
  TrendingUp, 
  RefreshCw,
  Sparkles,
  Search,
  Filter,
  Bookmark
} from 'lucide-react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AnimeRow from './components/AnimeRow';
import AnimeCard from './components/AnimeCard';
import DetailModal from './components/DetailModal';
import VideoPlayer from './components/VideoPlayer';
import { 
  Anime, 
  Category, 
  Bookmark as BookmarkType, 
  WatchHistoryItem, 
  StreamState 
} from './types';
import { BACKUP_DATA } from './data/backupData';

// Hardcoded Categories matching Jikan API endpoints
const CATEGORIES: Category[] = [
  { name: 'Populer & Update', id: 'catTrend', query: '/seasons/now', color: '#ff3e3e' },
  { name: 'Romance', id: 'catRomance', query: '/anime?genres=22', color: '#ec4899' },
  { name: 'Action & Fantasy', id: 'catAction', query: '/anime?genres=1', color: '#3b82f6' },
  { name: 'Fantasy & Magic', id: 'catFantasy', query: '/anime?genres=10', color: '#f59e0b' },
  { name: 'School Life', id: 'catSchool', query: '/anime?genres=23', color: '#8b5cf6' },
  { name: 'Comedy & Humour', id: 'catComedy', query: '/anime?genres=4', color: '#06b6d4' },
  { name: 'Isekai Fantasy', id: 'catIsekai', query: '/anime?genres=62', color: '#10b981' },
  { name: 'Harem & Romance', id: 'catHarem', query: '/anime?genres=35', color: '#f43f5e' }
];

export default function App() {
  // Navigation & UI States
  const [currentView, setCurrentView] = useState<'home' | 'category' | 'search'>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detail Overlay & Streaming States
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | null>(null);
  const [streamState, setStreamState] = useState<StreamState | null>(null);

  // Active Category View States (for "Lihat Semua" pages)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryAnimeList, setCategoryAnimeList] = useState<Anime[]>([]);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryHasNext, setCategoryHasNext] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [sortBy, setSortBy] = useState<string>('default');

  // Search Results States
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);

  // Home Screen rows state cache
  const [rowCache, setRowCache] = useState<Record<string, { list: Anime[]; loading: boolean; error: boolean }>>({});

  // Bookmarks & History states (Persistent in localStorage)
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  // Infinite Scroll Trigger Ref
  const gridBottomObserverRef = useRef<HTMLDivElement>(null);

  // ==================== LOCAL PERSISTENCE ====================
  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem('kaedesu_bookmarks');
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));

      const storedHistory = localStorage.getItem('kaedesu_history');
      if (storedHistory) setWatchHistory(JSON.parse(storedHistory));
    } catch (e) {
      console.error('Failed to parse localStorage data:', e);
    }
  }, []);

  const saveBookmarks = (newBookmarks: BookmarkType[]) => {
    setBookmarks(newBookmarks);
    localStorage.setItem('kaedesu_bookmarks', JSON.stringify(newBookmarks));
  };

  const saveHistory = (newHistory: WatchHistoryItem[]) => {
    setWatchHistory(newHistory);
    localStorage.setItem('kaedesu_history', JSON.stringify(newHistory));
  };

  // ==================== API ROW LOADERS ====================
  const fetchRowData = useCallback(async (category: Category, force = false) => {
    // 1. Check in-memory state cache
    if (rowCache[category.id]?.list && rowCache[category.id].list.length > 0 && !force) return;

    const cacheKey = `kaedesu_row_cache_${category.id}`;

    // 2. Try loading from sessionStorage first (for current session as requested), then localStorage
    if (!force) {
      try {
        const sessionStored = sessionStorage.getItem(cacheKey);
        if (sessionStored) {
          const { list, timestamp } = JSON.parse(sessionStored);
          if (list && list.length > 0) {
            setRowCache((prev) => ({
              ...prev,
              [category.id]: { list, loading: false, error: false }
            }));
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to parse sessionStorage cache for ' + category.id, err);
      }

      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const { list, timestamp } = JSON.parse(stored);
          // If cache is under 2 hours old, use it immediately
          if (list && list.length > 0 && Date.now() - timestamp < 2 * 60 * 60 * 1000) {
            setRowCache((prev) => ({
              ...prev,
              [category.id]: { list, loading: false, error: false }
            }));
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to parse localStorage cache for ' + category.id, err);
      }
    }

    // Set state to loading
    setRowCache((prev) => ({
      ...prev,
      [category.id]: { list: prev[category.id]?.list || [], loading: true, error: false }
    }));

    try {
      // Stagger request timing dynamically based on category order to prevent parallel rate limiting
      const idx = CATEGORIES.findIndex((c) => c.id === category.id);
      const delay = Math.max(100, idx * 350);
      await new Promise((resolve) => setTimeout(resolve, delay));

      const res = await fetch(`https://api.jikan.moe/v4${category.query}${category.query.includes('?') ? '&' : '?'}limit=12&sfw=true`);
      if (!res.ok) throw new Error(`API returned status ${res.status}`);
      
      const { data } = await res.json();
      if (!data || !Array.isArray(data)) throw new Error('Invalid data format received');

      // Save successful result to sessionStorage AND localStorage
      try {
        const cacheObj = JSON.stringify({
          list: data,
          timestamp: Date.now()
        });
        sessionStorage.setItem(cacheKey, cacheObj);
        localStorage.setItem(cacheKey, cacheObj);
      } catch (err) {
        console.error('Failed to store cache in session/localStorage:', err);
      }

      setRowCache((prev) => ({
        ...prev,
        [category.id]: { list: data, loading: false, error: false }
      }));
    } catch (e) {
      console.error(`Failed to load category row ${category.name}:`, e);
      
      // Fallback 1: Try sessionStorage first, then expired localStorage cache
      let fallbackList: Anime[] = [];
      try {
        const sessionStored = sessionStorage.getItem(cacheKey);
        if (sessionStored) {
          const { list } = JSON.parse(sessionStored);
          if (list && list.length > 0) {
            fallbackList = list;
            console.log(`Fallback: Used sessionStorage cache for ${category.name}`);
          }
        }
      } catch (_) {}

      if (fallbackList.length === 0) {
        try {
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            const { list } = JSON.parse(stored);
            if (list && list.length > 0) {
              fallbackList = list;
              console.log(`Fallback: Used expired localStorage cache for ${category.name}`);
            }
          }
        } catch (_) {}
      }

      // Fallback 2: If no cache exists at all, use high-quality handpicked BACKUP_DATA
      if (fallbackList.length === 0) {
        fallbackList = BACKUP_DATA[category.id] || [];
        console.log(`Fallback: Used hardcoded BACKUP_DATA for ${category.name}`);
      }

      setRowCache((prev) => ({
        ...prev,
        [category.id]: { 
          list: fallbackList, 
          loading: false, 
          // Only show error state if we have absolutely zero list items to show
          error: fallbackList.length === 0 
        }
      }));
    }
  }, [rowCache]);

  // Initial load of first categories, with sequenced delay to safeguard MAL Jikan API
  useEffect(() => {
    const loadSequenced = async () => {
      for (const cat of CATEGORIES) {
        await fetchRowData(cat);
        // Stagger load by 400ms to allow smooth parallel-like fetching without hitting 429
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    };
    loadSequenced();
  }, []);

  // Listen to custom retry fetch events
  useEffect(() => {
    const handleRefetch = (e: Event) => {
      const animeId = (e as CustomEvent).detail;
      if (animeId) setSelectedAnimeId(animeId);
    };
    window.addEventListener('refetch-anime', handleRefetch);
    return () => window.removeEventListener('refetch-anime', handleRefetch);
  }, []);

  // ==================== SEARCH LOGIC ====================
  const handleSearch = async (query: string) => {
    if (!query || query.trim().length <= 2) {
      setSearchResults([]);
      setCurrentView('home');
      return;
    }

    setSearchLoading(true);
    setSearchError(false);
    setCurrentView('search');

    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=24&sfw=true`);
      if (!res.ok) throw new Error('Search failed');
      const { data } = await res.json();
      setSearchResults(data || []);
    } catch (e) {
      console.error('Anime Search Error:', e);
      setSearchError(true);
    } finally {
      setSearchLoading(false);
    }
  };

  // ==================== VIEW ALL CATEGORY GRID ====================
  const loadNextCategoryPage = useCallback(async () => {
    if (!selectedCategory || categoryLoading || !categoryHasNext) return;

    setCategoryLoading(true);
    setCategoryError(false);

    try {
      const querySeparator = selectedCategory.query.includes('?') ? '&' : '?';
      const endpoint = `https://api.jikan.moe/v4${selectedCategory.query}${querySeparator}page=${categoryPage}&limit=24&sfw=true`;
      
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('API Page Fetch Error');
      const { data, pagination } = await res.json();

      if (data && data.length > 0) {
        setCategoryAnimeList((prev) => {
          // Prevent duplicates by checking mal_id
          const existingIds = new Set(prev.map((a) => a.mal_id));
          const uniques = data.filter((item: Anime) => !existingIds.has(item.mal_id));
          return [...prev, ...uniques];
        });
        setCategoryHasNext(pagination.has_next_page);
        setCategoryPage((p) => p + 1);
      } else {
        setCategoryHasNext(false);
      }
    } catch (e) {
      console.error('Error fetching page grid:', e);
      setCategoryError(true);
    } finally {
      setCategoryLoading(false);
    }
  }, [selectedCategory, categoryLoading, categoryHasNext, categoryPage]);

  // Handle intersection observer for infinite scroll
  useEffect(() => {
    if (currentView !== 'category' || !categoryHasNext || categoryLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextCategoryPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentElem = gridBottomObserverRef.current;
    if (currentElem) observer.observe(currentElem);

    return () => {
      if (currentElem) observer.unobserve(currentElem);
    };
  }, [currentView, categoryHasNext, categoryLoading, loadNextCategoryPage]);

  // Trigger entering a Category View All Grid
  const handleOpenCategory = (category: Category) => {
    setSelectedCategory(category);
    setCategoryAnimeList([]);
    setCategoryPage(1);
    setCategoryHasNext(true);
    setCategoryError(false);
    setCurrentView('category');
    // Force immediate first page load
    setTimeout(() => {
      setCategoryLoading(false);
      setCategoryPage(1);
    }, 50);
  };

  // Trigger loading first page once category is selected
  useEffect(() => {
    if (selectedCategory && categoryPage === 1 && categoryAnimeList.length === 0) {
      loadNextCategoryPage();
    }
  }, [selectedCategory, categoryPage, categoryAnimeList.length, loadNextCategoryPage]);

  // Sorting Handler inside category grid view
  const getSortedAnimeList = () => {
    if (sortBy === 'score') {
      return [...categoryAnimeList].sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    if (sortBy === 'episodes') {
      return [...categoryAnimeList].sort((a, b) => (b.episodes || 0) - (a.episodes || 0));
    }
    if (sortBy === 'title') {
      return [...categoryAnimeList].sort((a, b) => a.title.localeCompare(b.title));
    }
    return categoryAnimeList;
  };

  // ==================== USER ACTIONS: FAVORITES & BOOKMARKS ====================
  const handleToggleBookmark = (anime: Anime, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const isExist = bookmarks.some((b) => b.mal_id === anime.mal_id);
    if (isExist) {
      const filtered = bookmarks.filter((b) => b.mal_id !== anime.mal_id);
      saveBookmarks(filtered);
    } else {
      const newBookmark: BookmarkType = {
        mal_id: anime.mal_id,
        title: anime.title,
        image_url: anime.images.jpg.image_url,
        score: anime.score,
        addedAt: Date.now()
      };
      saveBookmarks([newBookmark, ...bookmarks]);
    }
  };

  const handleRemoveBookmarkSidebar = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const filtered = bookmarks.filter((b) => b.mal_id !== id);
    saveBookmarks(filtered);
  };

  // ==================== USER ACTIONS: WATCH HISTORY ====================
  const handleMarkWatched = useCallback((malId: number, epNum: number) => {
    // Find anime title from rows or search
    let title = 'Anime Stream';
    let imageUrl = '';
    let totalEps = 12;

    // Search cache rows
    for (const catId of Object.keys(rowCache)) {
      const found = rowCache[catId].list.find((a) => a.mal_id === malId);
      if (found) {
        title = found.title;
        imageUrl = found.images.jpg.image_url;
        totalEps = found.episodes || 12;
        break;
      }
    }

    // Try search results or categories list
    if (!imageUrl) {
      const found = [...searchResults, ...categoryAnimeList].find((a) => a.mal_id === malId);
      if (found) {
        title = found.title;
        imageUrl = found.images.jpg.image_url;
        totalEps = found.episodes || 12;
      }
    }

    const newHistoryItem: WatchHistoryItem = {
      mal_id: malId,
      title,
      image_url: imageUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=120&q=80',
      ep: epNum,
      totalEps,
      watchedAt: Date.now()
    };

    setWatchHistory((prevHistory) => {
      const filtered = prevHistory.filter((h) => h.mal_id !== malId);
      const updated = [newHistoryItem, ...filtered];
      localStorage.setItem('kaedesu_history', JSON.stringify(updated));
      return updated;
    });
  }, [rowCache, searchResults, categoryAnimeList]);

  const handleClearHistory = () => {
    saveHistory([]);
  };

  // Resume stream directly
  const handleResumeEpisode = (malId: number, ep: number, title: string, totalEps: number) => {
    setStreamState({
      malId,
      ep,
      title,
      totalEps,
      quality: '720p',
      server: 'Server Vidsrc'
    });
  };

  // Launch stream player from anywhere
  const handlePlayEpisode = (malId: number, ep: number, title: string, totalEps: number) => {
    setStreamState({
      malId,
      ep,
      title,
      totalEps,
      quality: '720p',
      server: 'Server Vidsrc'
    });
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden text-white flex flex-col">
      {/* Immersive Animated Nebula/Aurora Canvas Backdrop */}
      <div className="nebula-bg"></div>

      {/* Primary Global Header */}
      <Header
        onSearch={handleSearch}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogoClick={() => {
          setCurrentView('home');
          setSearchQuery('');
        }}
      />

      {/* Drawer Drawer Navigation Overlay */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        bookmarks={bookmarks}
        watchHistory={watchHistory}
        onSelectAnime={(id) => setSelectedAnimeId(id)}
        onClearHistory={handleClearHistory}
        onRemoveBookmark={handleRemoveBookmarkSidebar}
        onNavigateHome={() => {
          setCurrentView('home');
          setSearchQuery('');
        }}
        onNavigateUpdates={() => handleOpenCategory(CATEGORIES[0])}
        onNavigateHistory={() => setSidebarOpen(true)}
        onResumeEpisode={handleResumeEpisode}
      />

      {/* Main Container Stage */}
      <main className="flex-grow pt-24 pb-16 max-w-7xl w-full mx-auto relative z-10">
        
        {/* ==================== SCREEN 1: SEARCH RESULTS ==================== */}
        {currentView === 'search' && (
          <div id="search-results-viewport" className="px-4 md:px-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCurrentView('home');
                    setSearchQuery('');
                  }}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition border border-white/10 text-white"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-brand uppercase">
                    Hasil Pencarian
                  </span>
                  <h2 className="text-lg md:text-xl font-extrabold text-white uppercase">
                    "{searchQuery}"
                  </h2>
                </div>
              </div>
            </div>

            {searchLoading ? (
              <div className="py-24 text-center">
                <div className="loading-pulse"></div>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-4">
                  Mencari Anime kesukaanmu...
                </p>
              </div>
            ) : searchError ? (
              <div className="py-16 text-center max-w-md mx-auto">
                <p className="text-sm font-bold text-white/70">
                  Gagal melakukan pencarian karena batasan frekuensi API.
                </p>
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="mt-4 px-6 py-2.5 bg-brand text-white text-xs font-black uppercase rounded-full transition-all active:scale-95"
                >
                  Coba Lagi
                </button>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-24 text-center max-w-sm mx-auto">
                <Search size={32} className="mx-auto text-white/10 mb-3" />
                <p className="text-xs font-bold text-white/50">
                  Maaf, anime "{searchQuery}" tidak ditemukan. Coba kata kunci lainnya!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                {searchResults.map((anime) => (
                  <AnimeCard
                    key={anime.mal_id}
                    anime={anime}
                    onClick={() => setSelectedAnimeId(anime.mal_id)}
                    isBookmarked={bookmarks.some((b) => b.mal_id === anime.mal_id)}
                    onToggleBookmark={(e) => handleToggleBookmark(anime, e)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== SCREEN 2: VIEW ALL CATEGORY GRID ==================== */}
        {currentView === 'category' && selectedCategory && (
          <div id="category-viewport" className="px-4 md:px-6">
            
            {/* Header segment with sorting details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('home')}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition border border-white/10 text-white"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-brand uppercase">
                    Kategori Genre
                  </span>
                  <h2 className="text-lg md:text-xl font-extrabold text-white uppercase" style={{ color: selectedCategory.color }}>
                    {selectedCategory.name}
                  </h2>
                </div>
              </div>

              {/* Filtering selector tool */}
              <div className="flex items-center gap-2 self-start sm:self-auto bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl">
                <Filter size={13} className="text-white/40" />
                <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-white/80 outline-none cursor-pointer"
                >
                  <option value="default" className="bg-neutral-900">Default (MAL)</option>
                  <option value="score" className="bg-neutral-900">Rating Tertinggi</option>
                  <option value="episodes" className="bg-neutral-900">Banyak Episode</option>
                  <option value="title" className="bg-neutral-900">Nama A-Z</option>
                </select>
              </div>
            </div>

            {/* List Grids */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {getSortedAnimeList().map((anime) => (
                <AnimeCard
                  key={anime.mal_id}
                  anime={anime}
                  onClick={() => setSelectedAnimeId(anime.mal_id)}
                  isBookmarked={bookmarks.some((b) => b.mal_id === anime.mal_id)}
                  onToggleBookmark={(e) => handleToggleBookmark(anime, e)}
                />
              ))}
            </div>

            {/* Bottom loader trigger row */}
            <div ref={gridBottomObserverRef} className="py-12 text-center w-full">
              {categoryLoading && (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="loading-pulse"></div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest animate-pulse">
                    Memuat halaman selanjutnya...
                  </p>
                </div>
              )}
              {categoryError && !categoryLoading && (
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="text-xs text-white/50 font-bold">Gagal memuat halaman selanjutnya.</span>
                  <button
                    onClick={loadNextCategoryPage}
                    className="px-4 py-2 bg-brand/10 border border-brand/30 hover:bg-brand/20 text-brand text-[10px] font-black uppercase rounded-full transition"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}
              {!categoryHasNext && !categoryLoading && (
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  — Akhir dari halaman anime —
                </span>
              )}
            </div>
          </div>
        )}

        {/* ==================== SCREEN 3: HOME BERANDA SLIDERS ==================== */}
        {currentView === 'home' && (
          <div id="home-sliders-viewport" className="flex flex-col gap-2">
            
            {/* Quick Genre chip sliders */}
            <div className="px-4 md:px-6 mb-8">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                {CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat.id}
                    onClick={() => handleOpenCategory(cat)}
                    className="flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 text-white/70 hover:text-white hover:border-brand/40 bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic category sliding rows */}
            {CATEGORIES.map((cat) => {
              const cache = rowCache[cat.id] || { list: [], loading: true, error: false };
              return (
                <AnimeRow
                  key={cat.id}
                  category={cat}
                  animeList={cache.list}
                  isLoading={cache.loading}
                  isError={cache.error}
                  onRetry={() => fetchRowData(cat, true)}
                  onSelectAnime={(id) => setSelectedAnimeId(id)}
                  onSeeAll={() => handleOpenCategory(cat)}
                  bookmarks={bookmarks}
                  onToggleBookmark={handleToggleBookmark}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* ==================== FLOATING OVERLAYS: DETAIL & STREAM PLAYER ==================== */}
      <DetailModal
        animeId={selectedAnimeId}
        onClose={() => setSelectedAnimeId(null)}
        onPlayEpisode={handlePlayEpisode}
        bookmarks={bookmarks}
        onToggleBookmark={(anime) => handleToggleBookmark(anime)}
        watchHistory={watchHistory}
      />

      {streamState && (
        <VideoPlayer
          stream={streamState}
          onBack={() => setStreamState(null)}
          onPlayEpisode={handlePlayEpisode}
          onMarkWatched={handleMarkWatched}
        />
      )}

      {/* Global Bottom Navigation bar or footer */}
      <footer className="py-8 bg-black/40 border-t border-white/5 text-center px-4 mt-auto">
        <p className="text-xs font-bold text-white/50">
          Kaedesu Anime Streaming
        </p>
        <p className="text-[10px] font-semibold text-white/30 mt-1">
          Copyright © 2020 . All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
