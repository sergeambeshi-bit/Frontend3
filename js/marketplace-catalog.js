// js/marketplace-catalog.js

export const marketplaceItems = [
  {
    id: "m-track-1",
    category: "music",
    kind: "track",
    title: {
      fr: "Tambours de Nuit",
      en: "Night Drums"
    },
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
    title: {
      fr: "Echos des Palmiers",
      en: "Palm Echoes"
    },
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
    title: {
      fr: "Minuit a Douala",
      en: "Midnight In Douala"
    },
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
    title: {
      fr: "Les Voix du Marche",
      en: "Voices Of The Market"
    },
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
    title: {
      fr: "Nuit des Createurs de Yaounde",
      en: "Yaounde Creator Night"
    },
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
    title: {
      fr: "Week-end Afro-Cinema",
      en: "Afro-Film Weekend"
    },
    creator: "Cine Collective",
    price: 4500,
    releaseDate: "2026-05-22",
    popularity: 88,
    cover: "/assets/covers/cover7.png",
    city: "Douala"
  },
  {
    id: "merch-tee-1",
    category: "merch",
    kind: "apparel",
    title: {
      fr: "T-shirt Signature JENGU Live",
      en: "JENGU Live Signature Tee"
    },
    description: {
      fr: "T-shirt premium coupe boxy, impression recto-verso, edition limitee pour la scene createurs.",
      en: "Premium boxy-fit t-shirt with front and back print, limited release for creator culture."
    },
    creator: "JENGU Live",
    price: 12000,
    releaseDate: "2026-04-30",
    popularity: 90,
    cover: "/assets/covers/cover6.png",
    gallery: [
      "/assets/covers/cover6.png",
      "/assets/covers/cover7.png",
      "/assets/covers/cover1.png"
    ],
    variants: [
      { size: "S", color: "Noir", stock: 8 },
      { size: "M", color: "Noir", stock: 14 },
      { size: "L", color: "Noir", stock: 10 },
      { size: "XL", color: "Noir", stock: 5 }
    ],
    shipping: {
      regions: ["Cameroun", "Afrique Centrale"],
      eta: "3-7 jours"
    },
    city: "Yaounde"
  },
  {
    id: "merch-kit-1",
    category: "merch",
    kind: "collectible",
    title: {
      fr: "Pack Collector Afro-Cinema",
      en: "Afro-Film Collector Pack"
    },
    description: {
      fr: "Pack collector incluant tote bag, badge metal et poster numerote du week-end Afro-Cinema.",
      en: "Collector bundle including tote bag, metal pin, and numbered Afro-Film Weekend poster."
    },
    creator: "Cine Collective",
    price: 18000,
    releaseDate: "2026-05-01",
    popularity: 87,
    cover: "/assets/covers/cover5.png",
    gallery: [
      "/assets/covers/cover5.png",
      "/assets/covers/cover2.png",
      "/assets/covers/cover3.png"
    ],
    variants: [
      { size: "Standard", color: "Multicolor", stock: 12 }
    ],
    shipping: {
      regions: ["Cameroun", "Afrique de l'Ouest"],
      eta: "4-10 jours"
    },
    city: "Douala"
  },
  {
    id: "m-track-2",
    category: "music",
    kind: "track",
    title: {
      fr: "Sable Noir",
      en: "Black Sand"
    },
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
    bio: {
      fr: "Autrice-compositrice explorant l'afrofusion et des textures cinematographiques.",
      en: "Singer-songwriter exploring afrofusion and cinematic textures."
    },
    categories: ["music", "events", "merch"],
    avatar: "/assets/covers/album1.png"
  },
  {
    id: "creator-2",
    name: "Studio Ebano",
    city: "Yaounde",
    bio: {
      fr: "Collectif de cinema independant produisant des courts metrages et documentaires.",
      en: "Independent film collective producing shorts and documentaries."
    },
    categories: ["movies", "events", "merch"],
    avatar: "/assets/covers/cover3.png"
  },
  {
    id: "creator-3",
    name: "Lys Mboa",
    city: "Buea",
    bio: {
      fr: "Productrice et curatrice construisant des sorties culturelles immersives.",
      en: "Producer and curator building immersive culture drops."
    },
    categories: ["music", "movies", "events", "merch"],
    avatar: "/assets/covers/album2.png"
  }
];

export function filterItems(items, tab) {
  if (!tab || tab === "all") return [...items];
  return items.filter((item) => item.category === tab);
}

export function getLocalizedValue(value, lang) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (lang === "fr") {
    return value.fr || value.en || "";
  }

  return value.en || value.fr || "";
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
