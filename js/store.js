// SAVE PURCHASE
export function savePurchase(item){
  let purchases = JSON.parse(localStorage.getItem("purchases")) || [];

  // prevent duplicates
  const exists = purchases.find(p => p.name === item.name);

  if(!exists){
    purchases.push(item);
  }

  localStorage.setItem("purchases", JSON.stringify(purchases));
}

// GET PURCHASES
export function getPurchases(){
  return JSON.parse(localStorage.getItem("purchases")) || [];
}