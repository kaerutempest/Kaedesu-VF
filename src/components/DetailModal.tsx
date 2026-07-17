import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Star, 
  Calendar, 
  Tv, 
  Bookmark, 
  BookmarkCheck, 
  Play, 
  ChevronDown, 
  ChevronUp, 
  Film,
  Sparkles,
  Info
} from 'lucide-react';
import { Anime, Bookmark as BookmarkType, WatchHistoryItem, getProxiedImageUrl } from '../types';

interface DetailModalProps {
  animeId: number | null;
  onClose: () => void;
  onPlayEpisode: (malId: number, ep: number, title: string, totalEps: number) => void;
  bookmarks: BookmarkType[];
  onToggleBookmark: (anime: Anime) => void;
  watchHistory: WatchHistoryItem[];
}

export default function DetailModal({
  animeId,
  onClose,
  onPlayEpisode,
  bookmarks,
  onToggleBookmark,
  watchHistory,
}: DetailModalProps) {
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expandSynopsis, setExpandSynopsis] = useState(false);

  // Fetch full details of selected anime
  useEffect(() => {
    if (!animeId) {
      setAnime(null);
      return;
    }

    const fetchDetail = async () => {
      const cacheKey = `kaedesu_detail_cache_${animeId}`;
      
      // 1. Try loading from sessionStorage first (for current tab session as requested)
      try {
        const sessionStored = sessionStorage.getItem(cacheKey);
        if (sessionStored) {
          const { data } = JSON.parse(sessionStored);
          if (data) {
            setAnime(data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to parse sessionStorage detail cache for ' + animeId, err);
      }

      // 2. Try loading from localStorage cache
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const { data, timestamp } = JSON.parse(stored);
          // Anime details are static, so 24-hour cache is perfectly safe and super fast
          if (data && Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            setAnime(data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to parse detail cache for ' + animeId, err);
      }

      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/full`);
        if (!res.ok) throw new Error('API Rate limit or Network Error');
        const { data } = await res.json();
        
        // Cache detail data in both sessionStorage AND localStorage
        try {
          const cacheObj = JSON.stringify({
            data,
            timestamp: Date.now()
          });
          sessionStorage.setItem(cacheKey, cacheObj);
          localStorage.setItem(cacheKey, cacheObj);
        } catch (err) {
          console.error('Failed to store detail cache:', err);
        }

        setAnime(data);
      } catch (err) {
        console.error('Error fetching anime details:', err);
        
        // Fallback: Use sessionStorage or expired localStorage cache if available
        let fallbackData = null;
        try {
          const sessionStored = sessionStorage.getItem(cacheKey);
          if (sessionStored) {
            const { data } = JSON.parse(sessionStored);
            if (data) fallbackData = data;
          }
        } catch (_) {}

        if (!fallbackData) {
          try {
            const stored = localStorage.getItem(cacheKey);
            if (stored) {
              const { data } = JSON.parse(stored);
              if (data) fallbackData = data;
            }
          } catch (_) {}
        }

        if (fallbackData) {
          setAnime(fallbackData);
        } else {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
    setExpandSynopsis(false);
  }, [animeId]);

  if (!animeId) return null;

  const isBookmarked = anime ? bookmarks.some((b) => b.mal_id === anime.mal_id) : false;

  const getWatchedEpisode = (epNum: number) => {
    return watchHistory.some((h) => h.mal_id === animeId && h.ep === epNum);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).id === 'detail-backdrop') {
      onClose();
    }
  };

  return (
    <div
      id="detail-backdrop"
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/95 backdrop-blur-md z-45 overflow-y-auto no-scrollbar flex items-start justify-center p-0 md:p-6"
    >
      <div className="relative w-full max-w-4xl bg-[#08080a] border-0 md:border border-white/10 rounded-none md:rounded-3xl shadow-2xl overflow-hidden min-h-screen md:min-h-0 my-0 md:my-8">
        {/* Floating Close Button */}
        <button
          id="close-modal-btn"
          onClick={onClose}
          className="fixed md:absolute top-5 right-5 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:text-brand hover:border-brand/30 flex items-center justify-center transition-all z-50 hover:scale-110 active:scale-90 shadow-lg"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {loading ? (
          /* Pulse loading view */
          <div className="h-screen md:h-[600px] flex flex-col items-center justify-center gap-4">
            <div className="loading-pulse"></div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest animate-pulse">
              Mengumpulkan Data Anime...
            </p>
          </div>
        ) : error ? (
          /* Error recovery layout */
          <div className="h-screen md:h-[600px] flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-bold text-white/70">
              Gagal memuat detail anime (Batas Frekuensi API).
            </p>
            <button
              onClick={() => {
                const id = animeId;
                setAnime(null);
                setLoading(true);
                // Trigger refetch by re-assigning
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('refetch-anime', { detail: id }));
                }, 100);
              }}
              className="px-6 py-2.5 bg-brand hover:bg-brand/90 text-white text-xs font-black uppercase rounded-full transition shadow-lg shadow-brand/20 active:scale-95"
            >
              Coba Lagi
            </button>
          </div>
        ) : !anime ? null : (
          /* Detail Content layout */
          <div className="flex flex-col">
            {/* Banner Backdrop Frame */}
            <div className="relative h-[45vh] md:h-[400px] w-full overflow-hidden bg-neutral-950">
              <img
                src={getProxiedImageUrl(anime.images.jpg.large_image_url || anime.images.jpg.image_url)}
                alt={anime.title}
                className="w-full h-full object-cover object-top filter blur-[2px] brightness-40 scale-102"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== anime.images.jpg.large_image_url) {
                    target.src = anime.images.jpg.large_image_url;
                  }
                }}
              />
              {/* Bottom black visual mask */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-black/50 to-transparent"></div>

              {/* Poster & Overlay layout */}
              <div className="absolute bottom-6 left-6 right-6 flex items-end gap-6">
                {/* Visual Cover Poster */}
                <div className="w-24 sm:w-32 md:w-40 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shrink-0 hidden sm:block">
                  <img
                    src={getProxiedImageUrl(anime.images.jpg.image_url)}
                    alt={anime.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== anime.images.jpg.image_url) {
                        target.src = anime.images.jpg.image_url;
                      }
                    }}
                  />
                </div>

                {/* Primary Info texts */}
                <div className="flex-grow min-w-0 pb-2">
                  {/* Genres row */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {anime.genres?.slice(0, 3).map((g) => (
                      <span
                        key={g.mal_id}
                        className="text-[9px] font-extrabold uppercase bg-brand/10 text-brand border border-brand/20 px-2.5 py-0.5 rounded-md"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>

                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-none tracking-tight uppercase line-clamp-2">
                    {anime.title}
                  </h1>
                  
                  {anime.title_japanese && (
                    <p className="text-xs font-medium text-white/50 mt-1 truncate">
                      {anime.title_japanese}
                    </p>
                  )}

                  {/* Rating stats strip */}
                  <div className="flex items-center flex-wrap gap-4 text-xs font-bold mt-4 text-white/80">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="fill-yellow-500 text-yellow-500" />
                      <span className="text-white text-sm font-black">
                        {anime.score ? anime.score.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                      <Calendar size={13} className="text-brand" />
                      <span>{anime.year || anime.status || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                      <Tv size={13} className="text-brand" />
                      <span>{anime.type || 'TV'}</span>
                    </div>
                    {anime.episodes && (
                      <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                        <Film size={13} className="text-brand" />
                        <span>{anime.episodes} Episode</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main scrollable body layout */}
            <div className="p-6 flex flex-col gap-8">
              
              {/* Primary action controls */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  id="play-first-episode-btn"
                  onClick={() => onPlayEpisode(anime.mal_id, 1, anime.title, anime.episodes || 12)}
                  className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 px-8 py-3.5 bg-brand hover:bg-brand/90 text-white font-extrabold text-xs uppercase rounded-xl transition duration-300 shadow-lg shadow-brand/20 active:scale-95"
                >
                  <Play size={14} className="fill-white" />
                  <span>Mulai Episode 1</span>
                </button>

                <button
                  id="toggle-fav-detail-btn"
                  onClick={() => onToggleBookmark(anime)}
                  className={`flex items-center justify-center gap-2 px-6 py-3.5 border text-xs font-extrabold uppercase rounded-xl transition duration-300 active:scale-95 ${
                    isBookmarked
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/80'
                  }`}
                >
                  {isBookmarked ? (
                    <>
                      <BookmarkCheck size={14} className="fill-brand" />
                      <span>Favorit Saya</span>
                    </>
                  ) : (
                    <>
                      <Bookmark size={14} />
                      <span>Simpan ke Favorit</span>
                    </>
                  )}
                </button>
              </div>

              {/* Synopsis Section */}
              {anime.synopsis && (
                <div id="synopsis-section" className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Info size={14} className="text-brand" />
                    <h3 className="text-xs font-extrabold tracking-wider text-white/40 uppercase">
                      Sinopsis Anime
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-medium">
                    {expandSynopsis
                      ? anime.synopsis
                      : `${anime.synopsis.substring(0, 260)}...`}
                  </p>
                  {anime.synopsis.length > 260 && (
                    <button
                      onClick={() => setExpandSynopsis(!expandSynopsis)}
                      className="text-brand text-xs font-bold hover:underline flex items-center gap-1 w-fit mt-1 self-start"
                    >
                      {expandSynopsis ? (
                        <>
                          <span>Sembunyikan</span>
                          <ChevronUp size={12} />
                        </>
                      ) : (
                        <>
                          <span>Baca Selengkapnya</span>
                          <ChevronDown size={12} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Episodes Navigator Section */}
              <div id="episodes-navigator-section" className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Play size={14} className="text-brand" />
                    <h3 className="text-xs font-extrabold tracking-wider text-white/40 uppercase">
                      Daftar Episode
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-white/40 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    Format: {anime.type || 'TV'}
                  </span>
                </div>

                {/* Grid list of episode cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[...Array(anime.episodes || 12)].map((_, idx) => {
                    const epNum = idx + 1;
                    const watched = getWatchedEpisode(epNum);
                    return (
                      <div
                        key={epNum}
                        id={`episode-card-${epNum}`}
                        onClick={() =>
                          onPlayEpisode(anime.mal_id, epNum, anime.title, anime.episodes || 12)
                        }
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition duration-300 group ${
                          watched
                            ? 'bg-[#0f1118] border-brand/20 hover:border-brand/40 text-white/90'
                            : 'bg-white/2 border-white/5 hover:border-brand/30 text-white/70'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold group-hover:text-brand transition">
                            Episode {epNum}
                          </span>
                          {watched && (
                            <span className="text-[9px] font-bold text-brand uppercase tracking-wider">
                              Sudah Ditonton
                            </span>
                          )}
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition duration-300 ${
                          watched
                            ? 'bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white'
                            : 'bg-white/5 text-white/50 group-hover:bg-brand group-hover:text-white'
                        }`}>
                          <Play size={10} className="fill-current ml-0.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
