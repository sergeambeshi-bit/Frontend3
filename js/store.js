// =========================
// STORAGE KEYS
// =========================
const PURCHASES_KEY = "purchases";
const UPLOADS_KEY = "uploads";


// =========================
// PURCHASE SYSTEM
// =========================

// SAVE PURCHASE
export function savePurchase(item){

  let purchases = JSON.parse(localStorage.getItem(PURCHASES_KEY)) || [];

  // prevent duplicates
  const exists = purchases.find(p => p.name === item.name);

  if(!exists){
    purchases.push({
      ...item,
      purchasedAt: new Date().toISOString(),

      // 🔥 earnings-ready fields
      artist: item.artist || "Unknown",
      price: item.price || 0
    });
  }

  localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
}

// GET PURCHASES
export function getPurchases(){
  return JSON.parse(localStorage.getItem(PURCHASES_KEY)) || [];
}


// =========================
// ARTIST EARNINGS SYSTEM
// =========================

// TOTAL EARNINGS FOR ARTIST
export function getArtistEarnings(artistName){

  const purchases = getPurchases();

  const artistSales = purchases.filter(p => p.artist === artistName);

  const total = artistSales.reduce((sum, item)=>{
    return sum + (item.price || 0);
  }, 0);

  return {
    total,
    sales: artistSales.length,
    tracks: artistSales
  };
}


// =========================
// UPLOAD SYSTEM (MARKETPLACE)
// =========================

// SAVE UPLOAD
export function saveUpload(track){

  let uploads = JSON.parse(localStorage.getItem(UPLOADS_KEY)) || [];

  uploads.push({
    ...track,
    id: Date.now(),
    createdAt: new Date().toISOString()
  });

  localStorage.setItem(UPLOADS_KEY, JSON.stringify(uploads));
}

// GET UPLOADS
export function getUploads(){
  return JSON.parse(localStorage.getItem(UPLOADS_KEY)) || [];
}


// =========================
// COMBINED MARKET DATA
// =========================

// Merge API + uploads (for marketplace)
export function getMarketplaceData(apiData = []){

  const uploads = getUploads();

  // newest first
  const sortedUploads = uploads.sort((a,b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  return [...sortedUploads, ...apiData];
}

// =========================
// PAYOUT SYSTEM
// =========================

const PAYOUTS_KEY = "payouts";

// REQUEST PAYOUT
export function requestPayout(artistName, amount){

  let payouts = JSON.parse(localStorage.getItem(PAYOUTS_KEY)) || [];

  payouts.push({
    id: Date.now(),
    artist: artistName,
    amount,
    status: "pending",
    date: new Date().toISOString()
  });

  localStorage.setItem(PAYOUTS_KEY, JSON.stringify(payouts));
}

// GET ARTIST PAYOUTS
export function getArtistPayouts(artistName){

  const payouts = JSON.parse(localStorage.getItem(PAYOUTS_KEY)) || [];

  return payouts.filter(p => p.artist === artistName);
}