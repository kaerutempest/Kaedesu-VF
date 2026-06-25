import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, X, Flame, Play, Clock, Sparkles } from 'lucide-react';

interface HeaderProps {
  onSearch: (query: string) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onLogoClick: () => void;
}

export default function Header({
  onSearch,
  onToggleSidebar,
  isSidebarOpen,
  searchQuery,
  setSearchQuery,
  onLogoClick,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 2) {
      onSearch(searchQuery);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-black/90 backdrop-blur-md border-b border-white/10 shadow-lg py-3'
          : 'bg-gradient-to-b from-black/80 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Logo and Menu toggle */}
        <div className="flex items-center gap-3">
          <button
            id="toggle-sidebar-btn"
            onClick={onToggleSidebar}
            className="p-2 hover:bg-white/10 rounded-full transition text-white focus:outline-none focus:ring-2 focus:ring-brand"
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          
          <div
            id="logo-brand"
            onClick={onLogoClick}
            className="cursor-pointer select-none flex items-center gap-1.5"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-brand shadow-[0_0_15px_rgba(255,62,62,0.6)]">
              <Play size={16} className="fill-white text-white ml-0.5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white uppercase italic">
              KAE<span className="neon-glow text-brand">DESU</span>
            </span>
          </div>
        </div>

        {/* Real-time search bar */}
        <form
          id="search-form"
          onSubmit={handleSearchSubmit}
          className="flex-grow max-w-lg relative"
        >
          <div className="relative flex items-center">
            <input
              ref={searchInputRef}
              type="text"
              id="search-anime-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Anime kesukaanmu..."
              className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/12 text-white placeholder-white/40 text-xs md:text-sm font-semibold py-2.5 pl-10 pr-10 rounded-full border border-white/10 focus:border-brand/50 outline-none transition-all focus:ring-2 focus:ring-brand/20"
            />
            <Search
              size={16}
              className="absolute left-3.5 text-white/40 pointer-events-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-12 p-1 text-white/40 hover:text-white rounded-full transition"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="submit"
              id="submit-search-btn"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-brand text-white text-[10px] md:text-xs font-bold rounded-full hover:bg-brand/90 transition shadow-[0_0_10px_rgba(255,62,62,0.4)]"
            >
              Cari
            </button>
          </div>
        </form>

        {/* Small desktop status quick link */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white/80">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Jikan V4 API</span>
          </div>
        </div>
      </div>
    </header>
  );
}
