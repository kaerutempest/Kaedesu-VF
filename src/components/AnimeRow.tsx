import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { Anime, Category, Bookmark } from '../types';

interface AnimeRowProps {
  category: Category;
  animeList: Anime[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectAnime: (id: number) => void;
  onSeeAll: () => void;
  bookmarks: Bookmark[];
  onToggleBookmark: (anime: Anime, e: React.MouseEvent) => void;
  key?: React.Key;
}

export default function AnimeRow({
  category,
  animeList,
  isLoading,
  isError,
  onRetry,
  onSelectAnime,
  onSeeAll,
  bookmarks,
  onToggleBookmark,
}: AnimeRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo =
        direction === 'left'
          ? scrollLeft - clientWidth * 0.75
          : scrollLeft + clientWidth * 0.75;

      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (rowRef.current) {
      setShowLeftArrow(rowRef.current.scrollLeft > 20);
    }
  };

  const isBookmarked = (id: number) => {
    return bookmarks.some((b) => b.mal_id === id);
  };

  return (
    <div id={`category-row-${category.id}`} className="relative flex flex-col mb-10">
      {/* Category header */}
      <div className="flex items-center justify-between mb-4 px-4 md:px-6">
        <div className="flex items-center gap-3 flex-grow">
          <h3
            className="text-xs md:text-sm font-black tracking-widest uppercase transition-all"
            style={{ color: category.color }}
          >
            {category.name}
          </h3>
          <div
            className="h-px flex-grow max-w-[200px] opacity-40"
            style={{
              background: `linear-gradient(90deg, ${category.color}, transparent)`,
            }}
          />
        </div>
        
        <button
          id={`see-all-${category.id}`}
          onClick={onSeeAll}
          className="text-[10px] md:text-xs font-black uppercase tracking-wider flex items-center gap-1 hover:brightness-110 active:scale-95 transition"
          style={{ color: category.color }}
        >
          <span>Semua</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Slide list wrapper with desktop arrows */}
      <div className="group/row relative px-4 md:px-6">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-[40%] -translate-y-1/2 w-10 h-10 rounded-full bg-black/85 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition duration-300 hover:scale-110 active:scale-90 z-20 shadow-lg"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-[40%] -translate-y-1/2 w-10 h-10 rounded-full bg-black/85 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition duration-300 hover:scale-110 active:scale-90 z-20 shadow-lg"
        >
          <ChevronRight size={20} />
        </button>

        {/* List Content Container */}
        {isLoading ? (
          /* Skeletal loading items */
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
            {[...Array(6)].map((_, idx) => (
              <div
                key={idx}
                className="flex-[0_0_120px] sm:flex-[0_0_140px] md:flex-[0_0_170px] aspect-[2/3] bg-white/5 rounded-xl animate-pulse flex flex-col justify-end p-3 border border-white/5"
              >
                <div className="h-3 bg-white/10 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-2 bg-white/10 rounded w-1/2 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : isError ? (
          /* Error recovery display */
          <div className="flex flex-col items-center justify-center bg-white/2 border border-white/5 rounded-2xl py-12 px-6 text-center gap-3">
            <AlertCircle size={24} className="text-brand animate-bounce" />
            <div className="text-xs font-bold text-white/70">
              Gagal memuat {category.name} (Batas Frekuensi API)
            </div>
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 text-[10px] font-black uppercase rounded-full transition-all active:scale-95"
            >
              <RefreshCw size={12} className="animate-spin" />
              <span>Coba Lagi</span>
            </button>
          </div>
        ) : animeList.length === 0 ? (
          /* Empty state */
          <div className="text-center py-10 text-xs font-bold text-white/30">
            Tidak ada anime ditemukan.
          </div>
        ) : (
          /* Actual scrollable row of anime cards */
          <div
            ref={rowRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto no-scrollbar py-2 scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {animeList.map((anime) => (
              <div
                key={anime.mal_id}
                className="flex-[0_0_120px] sm:flex-[0_0_140px] md:flex-[0_0_170px]"
              >
                <AnimeCard
                  anime={anime}
                  onClick={() => onSelectAnime(anime.mal_id)}
                  isBookmarked={isBookmarked(anime.mal_id)}
                  onToggleBookmark={(e) => onToggleBookmark(anime, e)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
