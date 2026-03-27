// js/api.js

const API_BASE = '/api'; // Placeholder; adjust to your backend

export async function fetchNewReleases() {
  const res = await fetch(`${API_BASE}/new-releases`);
  if (!res.ok) throw new Error('Failed to fetch new releases');
  return await res.json();
}

export async function fetchTopArtists() {
  const res = await fetch(`${API_BASE}/top-artists`);
  if (!res.ok) throw new Error('Failed to fetch top artists');
  return await res.json();
}

export async function fetchGenres() {
  const res = await fetch(`${API_BASE}/genres`);
  if (!res.ok) throw new Error('Failed to fetch genres');
  return await res.json();
}

export async function fetchTrending(country = 'Cameroon') {
  const res = await fetch(`${API_BASE}/trending?country=${country}`);
  if (!res.ok) throw new Error('Failed to fetch trending tracks');
  return await res.json();
}