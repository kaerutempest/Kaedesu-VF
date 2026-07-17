export interface AnimeImage {
  image_url: string;
  large_image_url: string;
}

export interface AnimeImages {
  jpg: AnimeImage;
}

export interface Genre {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface Anime {
  mal_id: number;
  url: string;
  images: AnimeImages;
  title: string;
  title_english?: string;
  title_japanese?: string;
  type: string;
  episodes: number | null;
  status: string;
  airing: boolean;
  score: number | null;
  synopsis?: string;
  year?: number;
  genres: Genre[];
}

export interface Category {
  name: string;
  id: string;
  query: string;
  color: string;
}

export interface StreamState {
  malId: number;
  ep: number;
  title: string;
  totalEps: number;
  quality: string;
  server: string;
  otakuEpId?: string;
  isOtakuMode?: boolean;
}

export interface Bookmark {
  mal_id: number;
  title: string;
  image_url: string;
  score: number | null;
  addedAt: number;
}

export interface WatchHistoryItem {
  mal_id: number;
  title: string;
  image_url: string;
  ep: number;
  totalEps: number;
  watchedAt: number;
}

export function getProxiedImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.includes('images.weserv.nl')) return url;
  // Remove protocol to make it clean
  const cleanUrl = url.replace(/^https?:\/\//i, '');
  return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=300&output=jpg&q=80`;
}

