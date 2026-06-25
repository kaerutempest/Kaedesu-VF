import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Tv, 
  Sparkles, 
  Volume2, 
  Play, 
  Square, 
  HelpCircle,
  Eye,
  Info,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { StreamState } from '../types';

interface VideoPlayerProps {
  stream: StreamState;
  onBack: () => void;
  onPlayEpisode: (malId: number, ep: number, title: string, totalEps: number) => void;
  onMarkWatched: (malId: number, ep: number) => void;
}

const SERVERS = [
  { name: 'Server Vidsrc (Primary)', url: 'https://vidsrc.to/embed/anime' },
  { name: 'Server Vidsrc.xyz (Backup)', url: 'https://vidsrc.xyz/embed/anime' },
  { name: 'Server Vidsrc.me (Alternative)', url: 'https://vidsrc.me/embed/anime' },
];

export default function VideoPlayer({
  stream,
  onBack,
  onPlayEpisode,
  onMarkWatched,
}: VideoPlayerProps) {
  const [activeServer, setActiveServer] = useState(SERVERS[0]);
  const [quality, setQuality] = useState('725p'); // Visual representation
  const [cinemaMode, setCinemaMode] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [showInfo, setShowInfo] = useState(true);

  // Stabilize the onMarkWatched callback using a ref to prevent infinite render loops
  const onMarkWatchedRef = useRef(onMarkWatched);
  useEffect(() => {
    onMarkWatchedRef.current = onMarkWatched;
  }, [onMarkWatched]);

  // Mark episode as watched when loaded
  useEffect(() => {
    onMarkWatchedRef.current(stream.malId, stream.ep);
  }, [stream.malId, stream.ep]);

  const handleEpisodeClick = (epNum: number) => {
    onPlayEpisode(stream.malId, epNum, stream.title, stream.totalEps);
  };

  const handleNextEpisode = () => {
    if (stream.ep < stream.totalEps) {
      onPlayEpisode(stream.malId, stream.ep + 1, stream.title, stream.totalEps);
    }
  };

  // Embed iframe link builder
  const streamUrl = `${activeServer.url}/${stream.malId}/${stream.ep}`;

  return (
    <div
      id="player-view-container"
      className={`fixed inset-0 bg-[#040405] z-50 overflow-y-auto no-scrollbar flex flex-col transition-all duration-500 ${
        cinemaMode ? 'bg-black' : ''
      }`}
    >
      {/* Dynamic cinema overlay */}
      <div className={`fixed inset-0 pointer-events-none bg-black/60 z-10 transition-opacity duration-300 ${
        cinemaMode ? 'opacity-100' : 'opacity-0'
      }`}></div>

      {/* Embedded Player Header */}
      <header className="sticky top-0 w-full z-25 py-4 px-4 md:px-6 flex items-center justify-between bg-black/90 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition active:scale-95 shrink-0"
            title="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <span className="text-[10px] md:text-xs font-black uppercase text-brand tracking-widest block">
              Memutar Episode {stream.ep}
            </span>
            <h2 className="text-xs md:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md md:max-w-xl">
              {stream.title}
            </h2>
          </div>
        </div>

        {/* Header visual settings */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCinemaMode(!cinemaMode)}
            className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
              cinemaMode
                ? 'bg-brand/10 border-brand text-brand shadow-[0_0_10px_rgba(255,62,62,0.15)]'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
          >
            <Volume2 size={12} />
            <span>Mode Bioskop</span>
          </button>
          
          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-brand hover:bg-brand/90 text-white shadow-[0_0_15px_rgba(255,62,62,0.35)] transition transform hover:scale-[1.03] active:scale-95 shrink-0"
          >
            <ExternalLink size={12} />
            <span>Buka di Tab Baru</span>
          </a>
        </div>
      </header>

      {/* Main Grid Viewport */}
      <div className="max-w-7xl w-full mx-auto px-0 md:px-6 py-0 md:py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-20 flex-grow">
        
        {/* Left column: Video Canvas + Embed Info */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* Iframe stage container */}
          <div
            id="video-player-viewport"
            className="w-full aspect-video bg-black rounded-none md:rounded-2xl overflow-hidden border-0 md:border border-white/10 shadow-2xl relative group"
          >
            <iframe
              src={streamUrl}
              className="w-full h-full border-none"
              allowFullScreen
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
              allow="autoplay; fullscreen"
              title={`${stream.title} - Episode ${stream.ep}`}
            />
          </div>

          {/* CTA Tab Baru for Troubleshooting */}
          <div className="mx-4 md:mx-0 bg-brand/10 border border-brand/30 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h4 className="text-xs font-black uppercase text-brand tracking-wider flex items-center justify-center md:justify-start gap-1.5">
                <Sparkles size={12} className="animate-pulse" />
                Mengalami Layar Kosong / Lag / Bouncing?
              </h4>
              <p className="text-[11px] text-white/70 mt-1 leading-relaxed">
                Beberapa browser membatasi iframe streaming di dalam preview. Tekan tombol kanan untuk memutar langsung di tab browser baru yang lebih stabil, lancar, dan support mode Fullscreen.
              </p>
            </div>
            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white text-xs font-black uppercase rounded-xl shadow-[0_0_15px_rgba(255,62,62,0.3)] hover:scale-[1.03] active:scale-95 transition"
            >
              <ExternalLink size={12} />
              <span>Buka di Tab Baru ↗</span>
            </a>
          </div>

          {/* Player controls toolbar info */}
          <div className="px-4 md:px-0 flex flex-col gap-4">
            
            {/* Embed adblocker notification block */}
            {showInfo && (
              <div className="bg-brand/5 border border-brand/20 p-4 rounded-xl flex items-start gap-3 relative overflow-hidden">
                <div className="p-2 bg-brand/10 text-brand rounded-lg shrink-0">
                  <Info size={14} />
                </div>
                <div className="flex-grow">
                  <h4 className="text-xs font-extrabold uppercase text-brand tracking-wider">
                    Saran Pemutar Video
                  </h4>
                  <p className="text-[11px] text-white/70 font-semibold leading-relaxed mt-0.5">
                    Gunakan browser dengan fitur <span className="text-brand font-bold">Adblocker / Brave Browser</span> untuk memblokir pop-up iklan dari server stream pihak ketiga demi kenyamanan menonton yang maksimal.
                  </p>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  className="absolute top-2 right-2 text-white/30 hover:text-white"
                >
                  <ArrowLeft size={14} className="rotate-90" />
                </button>
              </div>
            )}

            {/* Title block with autoplay toggler */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/2 border border-white/5 p-4 rounded-2xl">
              <div>
                <span className="text-[9px] font-black tracking-widest text-brand uppercase">
                  Streaming Aktif
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {stream.title} — Episode {stream.ep}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoplay}
                    onChange={(e) => setAutoplay(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand"></div>
                  <span className="text-xs font-extrabold uppercase text-white/60">
                    Autoplay
                  </span>
                </label>
                {stream.ep < stream.totalEps && (
                  <button
                    onClick={handleNextEpisode}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-brand hover:text-white border border-white/10 rounded-xl text-xs font-bold text-white/70 transition active:scale-95"
                  >
                    <span>Lanjut</span>
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Servers list & Episode grids */}
        <div className="px-4 md:px-0 flex flex-col gap-5">
          
          {/* Servers selection box */}
          <div className="flex flex-col gap-3 bg-white/2 border border-white/5 p-5 rounded-2xl">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Sparkles size={13} className="text-brand animate-pulse" />
              <h4 className="text-[10px] font-extrabold tracking-wider text-white/40 uppercase">
                Pilih Server Video
              </h4>
            </div>
            
            <div className="flex flex-col gap-2">
              {SERVERS.map((server) => {
                const active = activeServer.name === server.name;
                return (
                  <button
                    key={server.name}
                    onClick={() => setActiveServer(server)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition duration-300 ${
                      active
                        ? 'bg-brand/10 border-brand text-brand shadow-[0_0_10px_rgba(255,62,62,0.15)]'
                        : 'bg-white/2 border-white/5 text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xs font-bold">{server.name}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping"></span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality display representation box */}
          <div className="flex flex-col gap-3 bg-white/2 border border-white/5 p-5 rounded-2xl">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Eye size={13} className="text-brand" />
              <h4 className="text-[10px] font-extrabold tracking-wider text-white/40 uppercase">
                Kualitas Tampilan
              </h4>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {['480p', '720p', '1080p'].map((q) => {
                const active = quality === q;
                return (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`p-3 rounded-xl text-center font-bold text-xs border uppercase transition ${
                      active
                        ? 'bg-brand/10 border-brand text-brand shadow-[0_0_10px_rgba(255,62,62,0.15)]'
                        : 'bg-white/2 border-white/5 text-white/50 hover:bg-white/5'
                    }`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Episode Quick grid navigator */}
          <div className="flex flex-col gap-3 bg-white/2 border border-white/5 p-5 rounded-2xl">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Tv size={13} className="text-brand" />
              <h4 className="text-[10px] font-extrabold tracking-wider text-white/40 uppercase">
                Pilih Episode ({stream.totalEps})
              </h4>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
              {[...Array(stream.totalEps)].map((_, idx) => {
                const epNum = idx + 1;
                const active = stream.ep === epNum;
                return (
                  <button
                    key={epNum}
                    onClick={() => handleEpisodeClick(epNum)}
                    className={`py-2 rounded-lg text-center font-bold text-xs border transition ${
                      active
                        ? 'bg-brand text-white border-brand shadow-[0_0_10px_rgba(255,62,62,0.4)]'
                        : 'bg-white/2 border-white/5 text-white/60 hover:bg-white/5'
                    }`}
                  >
                    {epNum}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
