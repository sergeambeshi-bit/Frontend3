// js/marketplace-catalog.js

export const marketplaceItems = [
  {
    id: "m-track-1",
    category: "music",
    kind: "track",
    title: "Night Drums",
    creator: "Nora K",
    price: 1200,
    releaseDate: "2026-04-12",
    popularity: 92,
    cover: "/assets/covers/album1.png",
    city: "Douala"
  },
  {
    id: "m-album-1",
    category: "music",
    kind: "album",
    title: "Palm Echoes",
    creator: "Lys Mboa",
    price: 4200,
    releaseDate: "2026-03-29",
    popularity: 89,
    cover: "/assets/covers/album2.png",
    city: "Yaounde"
  },
  {
    id: "movie-1",
    category: "movies",
    kind: "film",
    title: "Midnight In Douala",
    creator: "Studio Ebano",
    price: 3000,
    releaseDate: "2026-04-21",
    popularity: 84,
    cover: "/assets/covers/cover3.png",
    city: "Douala"
  },
  {
    id: "movie-2",
    category: "movies",
    kind: "documentary",
    title: "Voices Of The Market",
    creator: "Muna Visuals",
    price: 2500,
    releaseDate: "2026-02-15",
    popularity: 80,
    cover: "/assets/covers/cover5.png",
    city: "Bafoussam"
  },
  {
    id: "event-1",
    category: "events",
    kind: "live",
    title: "Yaounde Creator Night",
    creator: "JENGU Live",
    price: 5000,
    releaseDate: "2026-05-14",
    popularity: 95,
    cover: "/assets/covers/cover6.png",
    city: "Yaounde"
  },
  {
    id: "event-2",
    category: "events",
    kind: "screening",
    title: "Afro-Film Weekend",
    creator: "Cine Collective",
    price: 4500,
    releaseDate: "2026-05-22",
    popularity: 88,
    cover: "/assets/covers/cover7.png",
    city: "Douala"
  },
  {
    id: "m-track-2",
    category: "music",
    kind: "track",
    title: "Sable Noir",
    creator: "Tino R",
    price: 1000,
    releaseDate: "2026-01-19",
    popularity: 76,
    cover: "/assets/covers/cover1.png",
    city: "Garoua"
  }
];

export const creatorProfiles = [
  {
    id: "creator-1",
    name: "Nora K",
    city: "Douala",
    bio: "Singer-songwriter exploring afrofusion and cinematic textures.",
    categories: ["music", "events"],
    avatar: "/assets/covers/album1.png"
  },
  {
    id: "creator-2",
    name: "Studio Ebano",
    city: "Yaounde",
    bio: "Independent film collective producing shorts and documentaries.",
    categories: ["movies", "events"],
    avatar: "/assets/covers/cover3.png"
  },
  {
    id: "creator-3",
    name: "Lys Mboa",
    city: "Buea",
    bio: "Producer and curator building immersive culture drops.",
    categories: ["music", "movies", "events"],
    avatar: "/assets/covers/album2.png"
  }
];

export function filterItems(items, tab) {
  if (!tab || tab === "all") return [...items];
  return items.filter((item) => item.category === tab);
}

export function sortItems(items, sortBy) {
  const list = [...items];

  if (sortBy === "newest") {
    return list.sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate));
  }

  if (sortBy === "price-asc") {
    return list.sort((a, b) => a.price - b.price);
  }

  if (sortBy === "price-desc") {
    return list.sort((a, b) => b.price - a.price);
  }

  return list.sort((a, b) => b.popularity - a.popularity);
}
