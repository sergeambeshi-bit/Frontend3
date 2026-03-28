// js/api.js

const API_BASE = '/api';

/* =========================================
   MOCK DATA (FULL SYSTEM READY)
========================================= */
const MOCK_DATA = [
  {
    id: 1,
    name: "Mboko Anthem",
    type: "Track",
    artist: "DJ Afro",
    album: "Street Kings",
    genre: "mboko",
    price: 300,
    cover: "/assets/covers/cover1.png"
  },
  {
    id: 2,
    name: "Makossa Vibes",
    type: "Track",
    artist: "Kofi Star",
    album: "Douala Nights",
    genre: "makossa",
    price: 300,
    cover: "/assets/covers/cover2.png"
  },
  {
    id: 3,
    name: "Ndombolo Energy",
    type: "Track",
    artist: "Mali Beats",
    album: "Congo Heat",
    genre: "ndombolo",
    price: 300,
    cover: "/assets/covers/cover1.png"
  },
  {
    id: 4,
    name: "Afropop Dreams",
    type: "Track",
    artist: "AfroNova",
    album: "Global Vibes",
    genre: "afropop",
    price: 300,
    cover: "/assets/covers/cover2.png"
  },
  {
    id: 5,
    name: "Bikutsi Nights",
    type: "Track",
    artist: "Cam Groove",
    album: "Village Rhythm",
    genre: "bikutsi",
    price: 300,
    cover: "/assets/covers/cover1.png"
  }
];

/* BLOG MOCK */
const BLOG_POSTS = [
  {
    id: 1,
    title: "Le Mboko domine la scène camerounaise",
    content: "Le Mboko est aujourd’hui l’un des genres les plus populaires...",
    image: "/assets/hero/hero1.png"
  },
  {
    id: 2,
    title: "Makossa : un héritage musical",
    content: "Le Makossa reste un pilier de la musique camerounaise...",
    image: "/assets/hero/hero2.png"
  }
];


/* =========================================
   GENERIC FETCH
========================================= */
async function safeFetch(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error("API failed");
    return await res.json();
  } catch (err) {
    console.warn("Using mock data:", err.message);

    // route fallback
    if(endpoint.includes("blog")) return BLOG_POSTS;

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

/* BLOG */
export async function fetchBlogPosts() {
  return safeFetch('/blog');
}

/* SINGLE TRACK */
export async function fetchTrack(name) {
  const data = await fetchBrowseResults();
  return data.find(t => t.name.toLowerCase() === name.toLowerCase());
}

/* ARTIST */
export async function fetchArtist(name) {
  const data = await fetchBrowseResults();
  return data.filter(t => t.artist.toLowerCase() === name.toLowerCase());
}

/* ALBUM */
export async function fetchAlbum(name) {
  const data = await fetchBrowseResults();
  return data.filter(t => t.album.toLowerCase() === name.toLowerCase());
}