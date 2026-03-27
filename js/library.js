// js/library.js

export function loadLibrary() {
  const libContainer = document.querySelector('.user-library');
  if (!libContainer) return;

  libContainer.innerHTML = '<p>Your library is empty (placeholder)</p>';
}