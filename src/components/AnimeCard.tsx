import React, { useState } from 'react';
import { Star, Tv, Bookmark, BookmarkCheck } from 'lucide-react';
import { Anime } from '../types';

interface AnimeCardProps {
  anime: Anime;
  onClick: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (e: React.MouseEvent) => void;
  key?: React.Key;
}

export default function AnimeCard({
  anime,
  onClick,
  isBookmarked,
  onToggleBookmark,
}: AnimeCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const scoreText = anime.score ? anime.score.toFixed(1) : 'N/A';
  const episodesText = anime.episodes ? `${anime.episodes} Ep` : 'Ongoing';
  const typeText = anime.type || 'TV';

  return (
    <div
      id={`anime-card-${anime.mal_id}`}
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer bg-white/2 hover:bg-white/5 border border-white/5 hover:border-brand/40 rounded-xl overflow-hidden transition-all duration-300 transform hover:-translate-y-2.5 active:scale-95 shadow-md hover:shadow-lg hover:shadow-brand/5 select-none"
    >
      {/* Poster image container */}
      <div className="relative aspect-[2/3] w-full bg-neutral-900 overflow-hidden">
        {/* Loading overlay background */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin"></span>
          </div>
        )}
        
        <img
          src={anime.images.jpg.image_url}
          alt={anime.title}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          referrerPolicy="no-referrer"
        />

        {/* Floating Category Badge */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          <span className="text-[9px] font-extrabold uppercase bg-black/75 backdrop-blur-md text-brand border border-brand/20 px-2 py-0.5 rounded-md shadow-md">
            {typeText}
          </span>
        </div>

        {/* Floating Quick Bookmark Action */}
        <button
          id={`bookmark-btn-${anime.mal_id}`}
          onClick={onToggleBookmark}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-white/70 hover:text-brand hover:border-brand/30 transition-all z-10 shadow-md active:scale-90"
          title={isBookmarked ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
        >
          {isBookmarked ? (
            <BookmarkCheck size={14} className="text-brand fill-brand/10" />
          ) : (
            <Bookmark size={14} />
          )}
        </button>

        {/* Immersive Dark Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <div className="text-[10px] text-white/80 font-semibold line-clamp-2 leading-tight">
            {anime.title_japanese || anime.title}
          </div>
        </div>
      </div>

      {/* Info details under poster */}
      <div className="p-3 flex-grow flex flex-col justify-between gap-1">
        <h4 className="text-[11px] md:text-xs font-bold text-white group-hover:text-brand transition-colors line-clamp-2 leading-tight uppercase tracking-wide">
          {anime.title}
        </h4>

        {/* Metadata badges footer */}
        <div className="flex items-center justify-between text-[9px] font-bold text-white/50 pt-1 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-1">
            <Star size={10} className="fill-yellow-500 text-yellow-500" />
            <span className="text-white/80">{scoreText}</span>
          </div>
          <div className="flex items-center gap-1">
            <Tv size={10} className="text-brand" />
            <span>{episodesText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
