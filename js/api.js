// js/api.js

const API_BASE = '/api';

/* =========================================
   FALLBACK MOCK DATA (WORKS WITHOUT BACKEND)
========================================= */
const MOCK_DATA = [
  {
    id: 1,
    name: "Afrobeat Anthem",
    type: "Track",
    artist: "DJ Afro",
    cover: "/assets/placeholders/track.svg"
  },
  {
    id: 2,
    name: "Makossa Vibes",
    type: "Album",
    artist: "Kofi Star",
    cover: "/assets/placeholders/album.svg"
  },
  {
    id: 3,
    name: "Ndombolo Energy",
    type: "Track",
    artist: "Mali Beats",
    cover: "/assets/placeholders/track.svg"
  },
  {
    id: 4,
    name: "Afro Fusion",
    type: "Album",
    artist: "AfroNova",
    cover: "/assets/placeholders/album.svg"
  },
  {
    id: 5,
    name: "Bikutsi Nights",
    type: "Track",
    artist: "Cam Groove",
    cover: "/assets/placeholders/track.svg"
  }
];


/* =========================================
   GENERIC FETCH HANDLER
========================================= */
async function safeFetch(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error("API failed");
    return await res.json();
  } catch (err) {
    console.warn("Using mock data:", err.message);
    return MOCK_DATA;
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