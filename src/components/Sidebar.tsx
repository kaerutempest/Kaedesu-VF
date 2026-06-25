import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Flame, 
  Heart, 
  Bookmark, 
  History, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Tv,
  Star,
  Info
} from 'lucide-react';
import { Bookmark as BookmarkType, WatchHistoryItem } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: BookmarkType[];
  watchHistory: WatchHistoryItem[];
  onSelectAnime: (id: number) => void;
  onClearHistory: () => void;
  onRemoveBookmark: (id: number, e: React.MouseEvent) => void;
  onNavigateHome: () => void;
  onNavigateUpdates: () => void;
  onNavigateHistory: () => void;
  onResumeEpisode: (malId: number, ep: number, title: string, totalEps: number) => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  bookmarks,
  watchHistory,
  onSelectAnime,
  onClearHistory,
  onRemoveBookmark,
  onNavigateHome,
  onNavigateUpdates,
  onNavigateHistory,
  onResumeEpisode,
}: SidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            id="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-45"
          />

          {/* Sidebar Drawer */}
          <motion.div
            id="sidebar-container"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-[#070708] border-r border-white/10 z-50 flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header branding info */}
            <div className="p-6 border-b border-white/5 flex flex-col gap-1 bg-gradient-to-b from-brand/10 to-transparent">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-white uppercase italic">
                  KAE<span className="neon-glow text-brand">DESU</span>
                </span>
                <span className="text-[9px] font-bold bg-brand/20 text-brand px-2 py-0.5 rounded-full border border-brand/30">
                  V2.0
                </span>
              </div>
              <p className="text-[10px] text-white/50 font-medium tracking-wide uppercase mt-1">
                Anime Streaming Hub
              </p>
            </div>

            {/* Navigation links */}
            <div className="p-4 flex flex-col gap-1 border-b border-white/5">
              <button
                onClick={() => {
                  onNavigateHome();
                  onClose();
                }}
                className="flex items-center justify-between w-full p-3 text-sm font-bold text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Home size={18} className="text-brand group-hover:scale-110 transition" />
                  <span>Beranda</span>
                </div>
                <ChevronRight size={14} className="opacity-40 group-hover:opacity-100 transition" />
              </button>

              <button
                onClick={() => {
                  onNavigateUpdates();
                  onClose();
                }}
                className="flex items-center justify-between w-full p-3 text-sm font-bold text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Flame size={18} className="text-brand group-hover:scale-110 transition animate-pulse" />
                  <span>Update Terbaru</span>
                </div>
                <ChevronRight size={14} className="opacity-40 group-hover:opacity-100 transition" />
              </button>

              <a
                href="https://saweria.co/Kaedesu"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full p-3 text-sm font-bold text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Heart size={18} className="text-pink-500 fill-pink-500/20 group-hover:scale-110 transition" />
                  <span>Dukung Saweria</span>
                </div>
                <ExternalLink size={14} className="opacity-40 group-hover:opacity-100 transition" />
              </a>
            </div>

            {/* Content area: Bookmarks and History (Scrollable) */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-6">
              
              {/* Bookmarks Section */}
              <div id="sidebar-bookmarks" className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-white/40 uppercase">
                    <Bookmark size={12} className="text-brand" />
                    <span>Favorit Saya ({bookmarks.length})</span>
                  </div>
                </div>

                {bookmarks.length === 0 ? (
                  <div className="bg-white/2 border border-dashed border-white/5 rounded-2xl p-6 text-center">
                    <Bookmark size={24} className="mx-auto text-white/10 mb-2" />
                    <p className="text-[11px] font-semibold text-white/40">
                      Belum ada anime favorit. Tandai anime kesukaanmu!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                    {bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.mal_id}
                        onClick={() => {
                          onSelectAnime(bookmark.mal_id);
                          onClose();
                        }}
                        className="flex items-center gap-3 p-2 bg-white/2 hover:bg-white/5 border border-white/5 hover:border-brand/30 rounded-xl cursor-pointer transition-all group relative"
                      >
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
                          <img
                            src={bookmark.image_url}
                            alt={bookmark.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <h4 className="text-xs font-bold text-white/90 truncate group-hover:text-brand transition">
                            {bookmark.title}
                          </h4>
                          {bookmark.score && (
                            <div className="flex items-center gap-1 text-[10px] text-white/50 font-medium mt-1">
                              <Star size={10} className="fill-yellow-500 text-yellow-500" />
                              <span>{bookmark.score}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => onRemoveBookmark(bookmark.mal_id, e)}
                          className="absolute right-2 p-1.5 text-white/20 hover:text-brand hover:bg-brand/10 rounded-lg transition"
                          title="Hapus dari Favorit"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Watch History Section */}
              <div id="sidebar-history" className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-white/40 uppercase">
                    <History size={12} className="text-brand" />
                    <span>Terakhir Dilihat</span>
                  </div>
                  {watchHistory.length > 0 && (
                    <button
                      onClick={onClearHistory}
                      className="text-[10px] font-bold text-brand hover:underline flex items-center gap-1"
                    >
                      <Trash2 size={10} />
                      Clear
                    </button>
                  )}
                </div>

                {watchHistory.length === 0 ? (
                  <div className="bg-white/2 border border-dashed border-white/5 rounded-2xl p-6 text-center">
                    <History size={24} className="mx-auto text-white/10 mb-2" />
                    <p className="text-[11px] font-semibold text-white/40">
                      Riwayat tontonan kosong. Mulai streaming sekarang!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                    {watchHistory.map((item) => (
                      <div
                        key={`${item.mal_id}-${item.ep}`}
                        onClick={() => {
                          onResumeEpisode(item.mal_id, item.ep, item.title, item.totalEps);
                          onClose();
                        }}
                        className="flex items-center gap-3 p-2 bg-white/2 hover:bg-white/5 border border-white/5 hover:border-brand/30 rounded-xl cursor-pointer transition-all group relative"
                      >
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0 relative">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-brand text-[9px] font-extrabold text-white text-center py-0.5">
                            EP {item.ep}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white/90 truncate group-hover:text-brand transition">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1 text-[10px] text-white/40 font-medium mt-1">
                            <Tv size={10} className="text-brand" />
                            <span>Episode {item.ep} dari {item.totalEps}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Footer branding */}
            <div className="p-4 border-t border-white/5 bg-black/50 text-center">
              <p className="text-[11px] font-bold text-white/80">KaeDesu Studio Inc.</p>
              <p className="text-[9px] font-semibold text-brand tracking-widest uppercase mt-0.5">
                Powered by KaeruShi & Jikan
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
