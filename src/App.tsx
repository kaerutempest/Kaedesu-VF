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

interface HistoryState {
  view: 'home' | 'category' | 'search';
  categoryId: string | null;
  searchQuery: string;
  selectedAnimeId: number | null;
  streamState: StreamState | null;
  sidebarOpen: boolean;
}

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
  const [isSearchLocal, setIsSearchLocal] = useState(false);

  // Home Screen rows state cache
  const [rowCache, setRowCache] = useState<Record<string, { list: Anime[]; loading: boolean; error: boolean }>>({});

  // Bookmarks & History states (Persistent in localStorage)
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  // Otakudesu Mode Integrator States
  const [isOtakuMode, setIsOtakuMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('kaedesu_otaku_mode');
      return stored === 'true';
    } catch (_) {
      return false;
    }
  });

  const [otakuApiUrl, setOtakuApiUrl] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('kaedesu_otaku_api_url');
      return stored || 'https://otakudesu-unofficial-api.vercel.app';
    } catch (_) {
      return 'https://otakudesu-unofficial-api.vercel.app';
    }
  });

  const [otakuLookup, setOtakuLookup] = useState<Record<number, string>>(() => {
    try {
      const stored = localStorage.getItem('kaedesu_otaku_lookup');
      return stored ? JSON.parse(stored) : {};
    } catch (_) {
      return {};
    }
  });

  const [activeOtakuEpisodes, setActiveOtakuEpisodes] = useState<any[]>([]);

  // Stable string hash function to generate clean numeric ID for Otakudesu slug
  const getNumericId = (slug: string): number => {
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
      const char = slug.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  const mapOtakuToAnime = (item: any, slugField = 'id'): Anime => {
    const slug = item[slugField] || item.slug || item.endpoint || '';
    const numericId = getNumericId(slug);
    
    return {
      mal_id: numericId,
      url: '',
      title: item.title || item.name || 'Anime Otaku',
      title_english: item.title || '',
      title_japanese: '',
      synopsis: item.synopsis || 'Nonton streaming anime gratis subtitle Indonesia.',
      images: {
        jpg: {
          image_url: item.thumb || item.image || item.img || '',
          large_image_url: item.thumb || item.image || item.img || ''
        }
      },
      genres: (item.genres || []).map((g: any, idx: number) => ({
        mal_id: idx,
        name: typeof g === 'string' ? g : g.name || ''
      })),
      score: parseFloat(item.rating || item.score) || 8.0,
      episodes: parseInt(item.episodes || item.total_episode || '12') || 12,
      status: item.status || 'Ongoing',
      airing: true,
      type: item.type || 'TV'
    };
  };

  // Infinite Scroll Trigger Ref
  const gridBottomObserverRef = useRef<HTMLDivElement>(null);

  // ==================== BROWSER BACK BUTTON / GESTURAL NAVIGATION INTEGRATION ====================
  const isPopStateRef = useRef(false);
  const lastSyncedState = useRef<HistoryState | null>(null);

  // Initialize/replace initial state on load
  useEffect(() => {
    const initialState: HistoryState = {
      view: 'home',
      categoryId: null,
      searchQuery: '',
      selectedAnimeId: null,
      streamState: null,
      sidebarOpen: false,
    };
    window.history.replaceState(initialState, '');
    lastSyncedState.current = initialState;
  }, []);

  // Listen to popstate event (triggered by browser back/forward or phone gesture)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as HistoryState | null;
      if (state) {
        isPopStateRef.current = true;
        setCurrentView(state.view);
        setSelectedCategory(CATEGORIES.find((c) => c.id === state.categoryId) || null);
        setSearchQuery(state.searchQuery || '');
        setSelectedAnimeId(state.selectedAnimeId);
        setStreamState(state.streamState);
        setSidebarOpen(state.sidebarOpen);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state changes with window.history
  useEffect(() => {
    const targetState: HistoryState = {
      view: currentView,
      categoryId: selectedCategory?.id || null,
      searchQuery: searchQuery,
      selectedAnimeId: selectedAnimeId,
      streamState: streamState,
      sidebarOpen: sidebarOpen,
    };

    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      lastSyncedState.current = targetState;
      return;
    }

    const isDifferent = !lastSyncedState.current ||
      lastSyncedState.current.view !== targetState.view ||
      lastSyncedState.current.categoryId !== targetState.categoryId ||
      lastSyncedState.current.searchQuery !== targetState.searchQuery ||
      lastSyncedState.current.selectedAnimeId !== targetState.selectedAnimeId ||
      JSON.stringify(lastSyncedState.current.streamState) !== JSON.stringify(targetState.streamState) ||
      lastSyncedState.current.sidebarOpen !== targetState.sidebarOpen;

    if (isDifferent) {
      const isForward =
        (lastSyncedState.current && lastSyncedState.current.view === 'home' && targetState.view !== 'home') ||
        (!lastSyncedState.current?.selectedAnimeId && targetState.selectedAnimeId) ||
        (!lastSyncedState.current?.streamState && targetState.streamState) ||
        (!lastSyncedState.current?.sidebarOpen && targetState.sidebarOpen) ||
        (lastSyncedState.current && lastSyncedState.current.searchQuery !== targetState.searchQuery && targetState.searchQuery !== '');

      if (isForward) {
        window.history.pushState(targetState, '');
      } else {
        window.history.replaceState(targetState, '');
      }
      lastSyncedState.current = targetState;
    }
  }, [currentView, selectedCategory, searchQuery, selectedAnimeId, streamState, sidebarOpen]);

  // Trigger search when returning back to search view with empty results
  useEffect(() => {
    if (currentView === 'search' && searchQuery && searchResults.length === 0 && !searchLoading && !searchError) {
      handleSearch(searchQuery);
    }
  }, [currentView, searchQuery, searchResults.length, searchLoading, searchError]);

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

    if (isOtakuMode) {
      try {
        const cleanBase = otakuApiUrl.replace(/\/$/, '');
        let url = `${cleanBase}/api/search/${
          category.id === 'catRomance' ? 'romance' : 
          category.id === 'catAction' ? 'action' : 
          category.id === 'catFantasy' ? 'fantasy' : 
          category.id === 'catSchool' ? 'school' : 
          category.id === 'catComedy' ? 'comedy' : 
          category.id === 'catIsekai' ? 'isekai' : 
          category.id === 'catHarem' ? 'harem' : 'naruto'
        }`;
        
        if (category.id === 'catTrend') {
          url = `${cleanBase}/api/ongoing`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const resJson = await response.json();
        const items = resJson.data || resJson.animeList || resJson.ongoing || resJson.search || resJson;
        if (!Array.isArray(items)) throw new Error("Invalid Otakudesu response list");

        const mappedList = items.map((item: any) => {
          const slug = item.id || item.endpoint || item.slug || item.url || '';
          const mappedItem = mapOtakuToAnime(item);
          setOtakuLookup(prev => {
            const next = { ...prev, [mappedItem.mal_id]: slug };
            localStorage.setItem('kaedesu_otaku_lookup', JSON.stringify(next));
            return next;
          });
          return mappedItem;
        });

        setRowCache((prev) => ({
          ...prev,
          [category.id]: { list: mappedList, loading: false, error: false }
        }));
        
        try {
          const cacheObj = JSON.stringify({
            list: mappedList,
            timestamp: Date.now()
          });
          sessionStorage.setItem(cacheKey, cacheObj);
          localStorage.setItem(cacheKey, cacheObj);
        } catch (_) {}
      } catch (err) {
        console.error(`Otakudesu fetch row error for ${category.name}:`, err);
        let fallbackList: Anime[] = [];
        try {
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            const { list } = JSON.parse(stored);
            if (list) fallbackList = list;
          }
        } catch (_) {}

        setRowCache((prev) => ({
          ...prev,
          [category.id]: { list: fallbackList, loading: false, error: fallbackList.length === 0 }
        }));
      }
      return;
    }

    try {
      const idx = CATEGORIES.findIndex((c) => c.id === category.id);
      const delay = Math.max(100, idx * 350);
      await new Promise((resolve) => setTimeout(resolve, delay));

      let res = null;
      const retries = 3;
      for (let i = 0; i < retries; i++) {
        res = await fetch(`https://api.jikan.moe/v4${category.query}${category.query.includes('?') ? '&' : '?'}limit=12&sfw=true`);
        if (res.status === 429) {
          const waitTime = (i + 1) * 2000 + Math.random() * 500;
          console.warn(`Jikan API 429 Rate Limited on row ${category.name}. Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        break;
      }

      if (!res || !res.ok) throw new Error(`API returned status ${res ? res.status : 'unknown'}`);
      
      const { data } = await res.json();
      if (!data || !Array.isArray(data)) throw new Error('Invalid data format received');

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

      if (fallbackList.length === 0) {
        fallbackList = BACKUP_DATA[category.id] || [];
        console.log(`Fallback: Used hardcoded BACKUP_DATA for ${category.name}`);
      }

      setRowCache((prev) => ({
        ...prev,
        [category.id]: { 
          list: fallbackList, 
          loading: false, 
          error: fallbackList.length === 0 
        }
      }));
    }
  }, [rowCache, isOtakuMode, otakuApiUrl]);

  // Initial load & mode switcher reload
  useEffect(() => {
    setRowCache({});
    const loadSequenced = async () => {
      for (const cat of CATEGORIES) {
        await fetchRowData(cat);
        await new Promise((resolve) => setTimeout(resolve, isOtakuMode ? 50 : 350));
      }
    };
    loadSequenced();
  }, [isOtakuMode]);

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
      setIsSearchLocal(false);
      setCurrentView('home');
      return;
    }

    setSearchLoading(true);
    setSearchError(false);
    setIsSearchLocal(false);
    setCurrentView('search');

    const cleanQuery = query.toLowerCase().trim();
    const cacheKey = `kaedesu_search_cache_${cleanQuery}`;

    // 1. Try sessionStorage cache first (very fast, 100% bypass of rate limits for repeated actions)
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setSearchResults(parsed);
          setSearchLoading(false);
          setSearchError(false);
          setIsSearchLocal(false);
          return;
        }
      }
    } catch (_) {}

    // 2. Try localStorage cache as secondary
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setSearchResults(parsed);
          setSearchLoading(false);
          setSearchError(false);
          setIsSearchLocal(false);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(parsed)); } catch (_) {}
          return;
        }
      }
    } catch (_) {}

    if (isOtakuMode) {
      try {
        const cleanBase = otakuApiUrl.replace(/\/$/, '');
        const res = await fetch(`${cleanBase}/api/search/${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        const items = json.data || json.animeList || json.search || json;

        if (!Array.isArray(items)) throw new Error('Search result is not an array');

        const mappedList = items.map((item: any) => {
          const slug = item.id || item.endpoint || item.slug || item.url || '';
          const mappedItem = mapOtakuToAnime(item);
          setOtakuLookup(prev => {
            const next = { ...prev, [mappedItem.mal_id]: slug };
            localStorage.setItem('kaedesu_otaku_lookup', JSON.stringify(next));
            return next;
          });
          return mappedItem;
        });

        setSearchResults(mappedList);
        setIsSearchLocal(false);

        try {
          const cacheStr = JSON.stringify(mappedList);
          sessionStorage.setItem(cacheKey, cacheStr);
          localStorage.setItem(cacheKey, cacheStr);
        } catch (_) {}
      } catch (err) {
        console.error('Otakudesu search error:', err);
        setSearchError(true);
      } finally {
        setSearchLoading(false);
      }
      return;
    }

    try {
      let res = null;
      const retries = 3;
      for (let i = 0; i < retries; i++) {
        res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=24&sfw=true`);
        if (res.status === 429) {
          const waitTime = (i + 1) * 2000 + Math.random() * 500;
          console.warn(`Jikan Search API 429 Rate Limited. Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        break;
      }

      if (!res || !res.ok) throw new Error(`API returned status ${res ? res.status : 'unknown'}`);
      
      const { data } = await res.json();
      const results = data || [];
      
      setSearchResults(results);
      setIsSearchLocal(false);

      if (results.length > 0) {
        try {
          const cacheStr = JSON.stringify(results);
          sessionStorage.setItem(cacheKey, cacheStr);
          localStorage.setItem(cacheKey, cacheStr);
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Anime Search Error, attempting fuzzy local search fallback:', e);
      
      // Smart fuzzy search local/backup fallback
      const localCollection: Anime[] = [];
      const seenIds = new Set<number>();

      // Collect from row data currently loaded
      (Object.values(rowCache) as Array<{ list: Anime[]; loading: boolean; error: boolean }>).forEach((row) => {
        if (row && Array.isArray(row.list)) {
          row.list.forEach((anime) => {
            if (anime && anime.mal_id && !seenIds.has(anime.mal_id)) {
              seenIds.add(anime.mal_id);
              localCollection.push(anime);
            }
          });
        }
      });

      // Collect from static backup data
      Object.values(BACKUP_DATA).forEach((list) => {
        if (Array.isArray(list)) {
          list.forEach((anime) => {
            if (anime && anime.mal_id && !seenIds.has(anime.mal_id)) {
              seenIds.add(anime.mal_id);
              localCollection.push(anime);
            }
          });
        }
      });

      // Apply fuzzy filtering
      const matched = localCollection.filter((anime) => {
        const titleMatch = anime.title && anime.title.toLowerCase().includes(cleanQuery);
        const titleJpMatch = anime.title_japanese && anime.title_japanese.toLowerCase().includes(cleanQuery);
        const synopsisMatch = anime.synopsis && anime.synopsis.toLowerCase().includes(cleanQuery);
        return titleMatch || titleJpMatch || synopsisMatch;
      });

      if (matched.length > 0) {
        setSearchResults(matched);
        setIsSearchLocal(true);
        setSearchError(false);
      } else {
        setSearchError(true);
        setIsSearchLocal(false);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  // ==================== VIEW ALL CATEGORY GRID ====================
  const loadNextCategoryPage = useCallback(async () => {
    if (!selectedCategory || categoryLoading || !categoryHasNext) return;

    setCategoryLoading(true);
    setCategoryError(false);

    if (isOtakuMode) {
      try {
        const cleanBase = otakuApiUrl.replace(/\/$/, '');
        let url = '';
        if (selectedCategory.id === 'catTrend') {
          url = `${cleanBase}/api/ongoing/page/${categoryPage}`;
        } else {
          const queryTerm = selectedCategory.id === 'catRomance' ? 'romance' : selectedCategory.id === 'catAction' ? 'action' : selectedCategory.id === 'catFantasy' ? 'fantasy' : selectedCategory.id === 'catSchool' ? 'school' : selectedCategory.id === 'catComedy' ? 'comedy' : selectedCategory.id === 'catIsekai' ? 'isekai' : selectedCategory.id === 'catHarem' ? 'harem' : 'naruto';
          url = `${cleanBase}/api/search/${queryTerm}`;
        }

        const res = await fetch(url);
        if (!res.ok && selectedCategory.id === 'catTrend') {
          url = `${cleanBase}/api/ongoing`;
          const resRetry = await fetch(url);
          if (!resRetry.ok) throw new Error('API Page Fetch Error');
          const json = await resRetry.json();
          const items = json.data || json.ongoing || json;
          if (Array.isArray(items)) {
            const mapped = items.map(item => mapOtakuToAnime(item));
            setCategoryAnimeList(mapped);
          }
          setCategoryHasNext(false);
          return;
        }

        if (!res.ok) throw new Error('API Page Fetch Error');
        const json = await res.json();
        const items = json.data || json.ongoing || json.search || json;

        if (items && Array.isArray(items) && items.length > 0) {
          const mapped = items.map((item: any) => {
            const slug = item.id || item.endpoint || item.slug || item.url || '';
            const mappedItem = mapOtakuToAnime(item);
            setOtakuLookup(prev => {
              const next = { ...prev, [mappedItem.mal_id]: slug };
              localStorage.setItem('kaedesu_otaku_lookup', JSON.stringify(next));
              return next;
            });
            return mappedItem;
          });

          setCategoryAnimeList((prev) => {
            const existingIds = new Set(prev.map((a) => a.mal_id));
            const uniques = mapped.filter((item) => !existingIds.has(item.mal_id));
            return [...prev, ...uniques];
          });

          if (selectedCategory.id !== 'catTrend') {
            setCategoryHasNext(false);
          } else {
            setCategoryPage((p) => p + 1);
            if (categoryPage >= 5) {
              setCategoryHasNext(false);
            }
          }
        } else {
          setCategoryHasNext(false);
        }
      } catch (err) {
        console.error('Otakudesu load next page error:', err);
        setCategoryError(true);
      } finally {
        setCategoryLoading(false);
      }
      return;
    }

    try {
      const querySeparator = selectedCategory.query.includes('?') ? '&' : '?';
      const endpoint = `https://api.jikan.moe/v4${selectedCategory.query}${querySeparator}page=${categoryPage}&limit=24&sfw=true`;
      
      let res = null;
      const retries = 3;
      for (let i = 0; i < retries; i++) {
        res = await fetch(endpoint);
        if (res.status === 429) {
          const waitTime = (i + 1) * 2000 + Math.random() * 500;
          console.warn(`Jikan API 429 Rate Limited on category grid. Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        break;
      }

      if (!res || !res.ok) throw new Error(`API returned status ${res ? res.status : 'unknown'}`);
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
  }, [selectedCategory, categoryLoading, categoryHasNext, categoryPage, isOtakuMode, otakuApiUrl]);

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
    if (isOtakuMode) {
      try {
        const cacheKey = `kaedesu_detail_cache_${malId}`;
        const sessionStored = sessionStorage.getItem(cacheKey);
        if (sessionStored) {
          const { data } = JSON.parse(sessionStored);
          if (data && Array.isArray(data.episode_list)) {
            setActiveOtakuEpisodes(data.episode_list);
          }
        } else {
          const slug = otakuLookup[malId];
          if (slug) {
            const cleanBase = otakuApiUrl.replace(/\/$/, '');
            fetch(`${cleanBase}/api/anime/${slug}`)
              .then(res => res.ok ? res.json() : fetch(`${cleanBase}/api/detail/${slug}`).then(r => r.json()))
              .then(json => {
                const detail = json.anime_detail || json.animeDetail || json.data || json;
                if (detail && Array.isArray(detail.episode_list)) {
                  setActiveOtakuEpisodes(detail.episode_list);
                  const mapped = {
                    mal_id: malId,
                    url: '',
                    title: detail.title || 'Otakudesu Anime',
                    title_english: detail.title || '',
                    title_japanese: detail.japanese || detail.japanese_title || '',
                    type: detail.type || 'TV',
                    episodes: detail.episode_list.length,
                    status: detail.status || 'Ongoing',
                    airing: (detail.status || '').toLowerCase().includes('ong'),
                    score: parseFloat(detail.rating || detail.score) || 8.0,
                    synopsis: detail.synopsis || detail.sinopsis || 'Tidak ada sinopsis.',
                    genres: (detail.genres || detail.genre_list || []).map((g: any, i: number) => ({
                      mal_id: i,
                      name: typeof g === 'string' ? g : g.name || g.title || ''
                    })),
                    images: {
                      jpg: {
                        image_url: detail.thumb || detail.image || '',
                        large_image_url: detail.thumb || detail.image || ''
                      }
                    },
                    episode_list: detail.episode_list
                  };
                  sessionStorage.setItem(cacheKey, JSON.stringify({ data: mapped, timestamp: Date.now() }));
                  localStorage.setItem(cacheKey, JSON.stringify({ data: mapped, timestamp: Date.now() }));
                }
              }).catch(err => console.error('Background fetch of resume detail failed:', err));
          }
        }
      } catch (_) {}
    }

    let otakuEpId: string | undefined;
    if (isOtakuMode) {
      const slug = otakuLookup[malId];
      if (slug) {
        otakuEpId = `${slug}-episode-${ep}-sub-indo`;
      }
    }

    handlePlayEpisode(malId, ep, title, totalEps, otakuEpId);
  };

  // Launch stream player from anywhere
  const handlePlayEpisode = (malId: number, ep: number, title: string, totalEps: number, otakuEpId?: string) => {
    let cleanOtakuEpId = otakuEpId;
    if (isOtakuMode && !cleanOtakuEpId) {
      const slug = otakuLookup[malId];
      if (slug) {
        cleanOtakuEpId = `${slug}-episode-${ep}-sub-indo`;
      }
    }

    setStreamState({
      malId,
      ep,
      title,
      totalEps,
      quality: '720p',
      server: 'Server Vidsrc',
      otakuEpId: cleanOtakuEpId,
      isOtakuMode
    });
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden text-white flex flex-col">
      {/* Immersive Animated Nebula/Aurora Canvas Backdrop */}
      <div className="nebula-bg"></div>

      {/* Primary Global Header */}
      <Header
        onSearch={handleSearch}
        onToggleSidebar={() => {
          if (sidebarOpen) {
            if (window.history.state && (window.history.state as any).sidebarOpen) {
              window.history.back();
            } else {
              setSidebarOpen(false);
            }
          } else {
            setSidebarOpen(true);
          }
        }}
        isSidebarOpen={sidebarOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogoClick={() => {
          if (currentView !== 'home') {
            if (window.history.state && (window.history.state as any).view !== 'home') {
              window.history.back();
            } else {
              setCurrentView('home');
              setSearchQuery('');
            }
          } else {
            setSearchQuery('');
          }
        }}
      />

      {/* Drawer Drawer Navigation Overlay */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => {
          if (window.history.state && (window.history.state as any).sidebarOpen) {
            window.history.back();
          } else {
            setSidebarOpen(false);
          }
        }}
        bookmarks={bookmarks}
        watchHistory={watchHistory}
        onSelectAnime={(id) => setSelectedAnimeId(id)}
        onClearHistory={handleClearHistory}
        onRemoveBookmark={handleRemoveBookmarkSidebar}
        onNavigateHome={() => {
          if (window.history.state && (window.history.state as any).sidebarOpen) {
            window.history.back();
          } else {
            setSidebarOpen(false);
          }
          setCurrentView('home');
          setSearchQuery('');
        }}
        onNavigateUpdates={() => {
          if (window.history.state && (window.history.state as any).sidebarOpen) {
            window.history.back();
          } else {
            setSidebarOpen(false);
          }
          handleOpenCategory(CATEGORIES[0]);
        }}
        onNavigateHistory={() => setSidebarOpen(true)}
        onResumeEpisode={handleResumeEpisode}
        isOtakuMode={isOtakuMode}
        onToggleOtakuMode={(enabled) => {
          setIsOtakuMode(enabled);
          localStorage.setItem('kaedesu_otaku_mode', String(enabled));
        }}
        otakuApiUrl={otakuApiUrl}
        onUpdateOtakuApiUrl={(url) => {
          setOtakuApiUrl(url);
          localStorage.setItem('kaedesu_otaku_api_url', url);
        }}
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
                    if (window.history.state && (window.history.state as any).view !== 'home') {
                      window.history.back();
                    } else {
                      setCurrentView('home');
                      setSearchQuery('');
                    }
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
            
            {isSearchLocal && (
              <div className="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-2xl text-amber-400">
                <Sparkles size={16} className="shrink-0 animate-pulse" />
                <span className="text-[11px] md:text-xs font-bold leading-normal">
                  Batasan frekuensi API terdeteksi. Menampilkan hasil pencarian cadangan dari database lokal Kaedesu.
                </span>
              </div>
            )}

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
                  onClick={() => {
                    if (window.history.state && (window.history.state as any).view !== 'home') {
                      window.history.back();
                    } else {
                      setCurrentView('home');
                    }
                  }}
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
        onClose={() => {
          if (window.history.state && (window.history.state as any).selectedAnimeId !== null) {
            window.history.back();
          } else {
            setSelectedAnimeId(null);
          }
        }}
        onPlayEpisode={(malId, ep, title, totalEps, otakuEpId) => {
          if (isOtakuMode) {
            try {
              const cacheKey = `kaedesu_detail_cache_${malId}`;
              const sessionStored = sessionStorage.getItem(cacheKey);
              if (sessionStored) {
                const { data } = JSON.parse(sessionStored);
                if (data && Array.isArray(data.episode_list)) {
                  setActiveOtakuEpisodes(data.episode_list);
                }
              }
            } catch (err) {
              console.error('Error loading episode list for player:', err);
            }
          }
          handlePlayEpisode(malId, ep, title, totalEps, otakuEpId);
        }}
        bookmarks={bookmarks}
        onToggleBookmark={(anime) => handleToggleBookmark(anime)}
        watchHistory={watchHistory}
        isOtakuMode={isOtakuMode}
        otakuApiUrl={otakuApiUrl}
        otakuLookup={otakuLookup}
      />

      {streamState && (
        <VideoPlayer
          stream={streamState}
          onBack={() => {
            if (window.history.state && (window.history.state as any).streamState !== null) {
              window.history.back();
            } else {
              setStreamState(null);
            }
          }}
          onPlayEpisode={handlePlayEpisode}
          onMarkWatched={handleMarkWatched}
          isOtakuMode={isOtakuMode}
          otakuApiUrl={otakuApiUrl}
          otakuEpisodes={activeOtakuEpisodes}
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
