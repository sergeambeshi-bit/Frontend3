// js/api.js

import { getUploads } from "/js/store.js";

const API_BASE = '/api';

/* =========================================
   MOCK DATA
========================================= */
const MOCK_DATA = [
  {
    id: 1,
    name: "Mboko Anthem",
    type: "track",
    artist: "DJ Afro",
    album: "Street Kings",
    genre: "mboko",
    price: 300,
    cover: "assets/covers/cover1.png",
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: "Makossa Vibes",
    type: "track",
    artist: "Kofi Star",
    album: "Douala Nights",
    genre: "makossa",
    price: 300,
    cover: "/assets/covers/cover2.png",
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    name: "Ndombolo Energy",
    type: "track",
    artist: "Mali Beats",
    album: "Congo Heat",
    genre: "ndombolo",
    price: 300,
    cover: "/assets/covers/cover1.png",
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    name: "Afropop Dreams",
    type: "track",
    artist: "AfroNova",
    album: "Global Vibes",
    genre: "afropop",
    price: 300,
    cover: "/assets/covers/cover2.png",
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    name: "Bikutsi Nights",
    type: "track",
    artist: "Cam Groove",
    album: "Village Rhythm",
    genre: "bikutsi",
    price: 300,
    cover: "/assets/covers/cover1.png",
    createdAt: new Date().toISOString()
  }
];

/* BLOG MOCK */
const BLOG_POSTS = [
  {
    id: 1,
    title: "Mboko dominates Cameroon",
    content: "Mboko is now one of the most popular genres...",
    image: "/assets/hero/hero1.png"
  },
  {
    id: 2,
    title: "Makossa legacy",
    content: "Makossa remains a pillar of African music...",
    image: "/assets/hero/hero2.png"
  }
];

/* =========================================
   NORMALIZER
========================================= */
function normalizeData(data) {
  if (!Array.isArray(data)) return [];

  return data.map(item => ({
    id: item.id || Date.now(),
    name: item.name || "Unknown",
    artist: item.artist || "Unknown Artist",
    album: item.album || "",
    genre: (item.genre || "").toLowerCase(),
    price: item.price || 300,
    cover: item.cover || "/assets/covers/cover1.png",
    type: item.type || "track",
    createdAt: item.createdAt || new Date().toISOString()
  }));
}

/* =========================================
   MERGE MARKETPLACE DATA
========================================= */
function mergeMarketplaceData(apiData = []) {

  const uploads = getUploads();

  const normalizedUploads = normalizeData(uploads);
  const normalizedApi = normalizeData(apiData);

  // newest uploads first
  const sortedUploads = normalizedUploads.sort((a,b)=>{
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return [...sortedUploads, ...normalizedApi];
}

/* =========================================
   SAFE FETCH
========================================= */
async function safeFetch(endpoint) {

  try {
    const res = await fetch(`${API_BASE}${endpoint}`);

    if (!res.ok) throw new Error("API error");

    const data = await res.json();

    return mergeMarketplaceData(data);

  } catch (err) {

    console.warn("⚠️ Using mock + uploads:", err.message);

    if (endpoint.includes("blog")) return BLOG_POSTS;

    return mergeMarketplaceData(MOCK_DATA);
  }
}

/* =========================================
   API FUNCTIONS
========================================= */

export async function fetchBrowseResults() {
  return safeFetch('/browse');
}

export async function fetchNewReleases() {
  return safeFetch('/new-releases');
}

export async function fetchTopArtists() {
  return safeFetch('/top-artists');
}

export async function fetchGenres() {
  return safeFetch('/genres');
}

export async function fetchTrending(country = 'Cameroon') {
  return safeFetch(`/trending?country=${country}`);
}

/* BLOG */
export async function fetchBlogPosts() {
  return safeFetch('/blog');
}

/* =========================================
   DETAIL FETCHERS
========================================= */

export async function fetchTrack(name) {
  const data = await fetchBrowseResults();
  return data.find(t => t.name.toLowerCase() === name.toLowerCase()) || null;
}

export async function fetchArtist(name) {
  const data = await fetchBrowseResults();
  return data.filter(t => t.artist.toLowerCase() === name.toLowerCase());
}

export async function fetchAlbum(name) {
  const data = await fetchBrowseResults();
  return data.filter(t => t.album.toLowerCase() === name.toLowerCase());
}