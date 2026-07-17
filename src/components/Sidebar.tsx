import React from 'react';
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
  Info,
  Settings,
  Database
} from 'lucide-react';
import { Bookmark as BookmarkType, WatchHistoryItem, getProxiedImageUrl } from '../types';

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
  isOtakuMode: boolean;
  onToggleOtakuMode: (enabled: boolean) => void;
  otakuApiUrl: string;
  onUpdateOtakuApiUrl: (url: string) => void;
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
  isOtakuMode,
  onToggleOtakuMode,
  otakuApiUrl,
  onUpdateOtakuApiUrl,
}: SidebarProps) {
  return (
    <>
      {/* Backdrop Overlay - Pure CSS fade in/out */}
      <div
        id="sidebar-backdrop"
        onClick={onClose}
        className={`fixed inset-0 bg-black/75 z-45 transition-opacity duration-200 ease-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar Drawer - Pure CSS slide in/out */}
      <div
        id="sidebar-container"
        className={`fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-[#070708] border-r border-white/10 z-50 flex flex-col shadow-2xl overflow-hidden transition-transform duration-200 ease-out transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
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
                    className="flex items-center gap-3 p-2 bg-white/2 hover:bg-white/8 border border-white/5 rounded-xl cursor-pointer group transition-all"
                  >
                    <div className="w-10 aspect-[3/4] rounded-lg overflow-hidden shrink-0 bg-neutral-950 border border-white/5">
                      <img
                        src={getProxiedImageUrl(bookmark.image_url)}
                        alt={bookmark.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white/80 group-hover:text-white transition truncate">
                        {bookmark.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Star size={9} className="text-amber-500 fill-amber-500" />
                        <span className="text-[9px] font-bold text-white/40">{bookmark.score || 'N/A'}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => onRemoveBookmark(bookmark.mal_id, e)}
                      className="p-1.5 text-white/30 hover:text-brand hover:bg-brand/10 rounded-lg transition"
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
                <span>Riwayat Nonton ({watchHistory.length})</span>
              </div>
              {watchHistory.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-[10px] font-black uppercase text-brand hover:text-brand/80 transition flex items-center gap-1"
                >
                  <Trash2 size={10} />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            {watchHistory.length === 0 ? (
              <div className="bg-white/2 border border-dashed border-white/5 rounded-2xl p-6 text-center">
                <History size={24} className="mx-auto text-white/10 mb-2" />
                <p className="text-[11px] font-semibold text-white/40">
                  Belum ada riwayat. Mulai nonton anime favoritmu!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                {watchHistory.map((item) => (
                  <div
                    key={`${item.mal_id}-${item.ep}`}
                    className="flex items-center gap-3 p-2 bg-white/2 hover:bg-white/8 border border-white/5 rounded-xl group transition-all"
                  >
                    <div 
                      onClick={() => {
                        onSelectAnime(item.mal_id);
                        onClose();
                      }}
                      className="w-10 aspect-[3/4] rounded-lg overflow-hidden shrink-0 bg-neutral-950 border border-white/5 cursor-pointer"
                    >
                      <img
                        src={getProxiedImageUrl(item.image_url)}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p 
                        onClick={() => {
                          onSelectAnime(item.mal_id);
                          onClose();
                        }}
                        className="text-[11px] font-bold text-white/80 group-hover:text-white transition truncate cursor-pointer"
                      >
                        {item.title}
                      </p>
                      <p className="text-[9px] font-semibold text-white/40 mt-0.5">
                        Episode {item.ep} dari {item.totalEps || 'N/A'}
                      </p>
                      <button
                        onClick={() => {
                          onResumeEpisode(item.mal_id, item.ep, item.title, item.totalEps || 12);
                          onClose();
                        }}
                        className="mt-1 flex items-center gap-1 bg-brand/10 hover:bg-brand/20 border border-brand/30 px-2 py-0.5 rounded-md text-[9px] font-black text-brand uppercase tracking-wider transition"
                      >
                        <Tv size={8} />
                        <span>Putar Ulang</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Settings Integrator section */}
          <div id="sidebar-settings" className="flex flex-col gap-3 mt-2 border-t border-white/5 pt-4">
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-white/40 uppercase px-1">
              <Settings size={12} className="text-brand" />
              <span>Akses Server Integrasi</span>
            </div>

            <div className="bg-white/2 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
              {/* Database engine selector tab */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">
                  Sumber Server Utama
                </span>
                <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => onToggleOtakuMode(false)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-extrabold uppercase rounded-lg transition-all duration-200 ${
                      !isOtakuMode
                        ? 'bg-brand text-white shadow-lg shadow-brand/10'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Database size={10} />
                    <span>Jikan API</span>
                  </button>
                  <button
                    onClick={() => onToggleOtakuMode(true)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-extrabold uppercase rounded-lg transition-all duration-200 ${
                      isOtakuMode
                        ? 'bg-brand text-white shadow-lg shadow-brand/10'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Tv size={10} />
                    <span>Otakudesu</span>
                  </button>
                </div>

                {isOtakuMode && (
                  <div className="flex flex-col gap-2 mt-1">
                    <label className="text-[9px] font-black uppercase text-white/40 tracking-wider">
                      Otakudesu API URL (Juju-Otaku)
                    </label>
                    <input
                      type="url"
                      value={otakuApiUrl}
                      onChange={(e) => onUpdateOtakuApiUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white/90 focus:border-brand/50 outline-none transition"
                    />
                    <div className="flex items-center gap-1.5 text-[9px] font-semibold text-white/40 mt-1 bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <Info size={10} className="text-brand shrink-0" />
                      <span>Masukkan endpoint base URL dari deployment <span className="text-brand font-bold">juju-otaku2.0</span> Anda.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer branding */}
        <div className="p-4 border-t border-white/5 bg-black/50 text-center">
          <p className="text-[11px] font-bold text-white/80">KaeDesu Studio Inc.</p>
          <p className="text-[9px] font-semibold text-brand tracking-widest uppercase mt-0.5">
            Powered By KaeruShi
          </p>
        </div>
      </div>
    </>
  );
}
