// js/auth.js

/* =========================
   STORAGE KEYS
========================= */
const USERS_KEY = "users";
const SESSION_KEY = "session";

/* =========================
   GET USERS
========================= */
function getUsers(){
  return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

/* =========================
   SAVE USERS
========================= */
function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/* =========================
   SIGNUP
========================= */
export function signup({name, email, password, role}){

  const users = getUsers();

  const exists = users.find(u => u.email === email);

  if(exists){
    alert("User already exists");
    return false;
  }

  const newUser = {
    id: Date.now(),
    name,
    email,
    password,
    role // "fan" or "artist"
  };

  users.push(newUser);
  saveUsers(users);

  // auto login
  localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));

  return true;
}

/* =========================
   LOGIN
========================= */
export function login({email, password}){

  const users = getUsers();

  const user = users.find(u => 
    u.email === email && u.password === password
  );

  if(!user){
    alert("Invalid credentials");
    return false;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));

  return true;
}

/* =========================
   LOGOUT
========================= */
export function logout(){
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "/";
}

/* =========================
   GET CURRENT USER
========================= */
export function getCurrentUser(){
  return JSON.parse(localStorage.getItem(SESSION_KEY));
}

/* =========================
   REQUIRE AUTH
========================= */
export function requireAuth(){

  const user = getCurrentUser();

  if(!user){
    window.location.href = "/user/login.html";
  }
}

/* =========================
   REQUIRE ROLE
========================= */
export function requireRole(role){

  const user = getCurrentUser();

  if(!user || user.role !== role){
    alert("Access denied");
    window.location.href = "/";
  }
}