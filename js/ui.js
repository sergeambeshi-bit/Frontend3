// frontend/js/ui.js
// Helper functions to render UI elements

export function renderAlbums(container, albums) {
  container.innerHTML = albums
    .map(
      (a) => `<div class="card album">
                <img src="${a.cover}" alt="${a.title}">
                <h3>${a.title}</h3>
                <p>${a.artist}</p>
              </div>`
    )
    .join("");
}

export function renderArtists(container, artists) {
  container.innerHTML = artists
    .map(
      (a) => `<div class="card artist">
                <img src="${a.avatar}" alt="${a.name}">
                <h3>${a.name}</h3>
              </div>`
    )
    .join("");
}

export function renderTracks(container, tracks) {
  container.innerHTML = tracks
    .map(
      (t) => `<div class="card track">
                <h3>${t.track}</h3>
                <p>${t.artist}</p>
              </div>`
    )
    .join("");
}

export function renderGenres(container, genres) {
  container.innerHTML = genres
    .map((g) => `<div class="card genre">${g}</div>`)
    .join("");
}