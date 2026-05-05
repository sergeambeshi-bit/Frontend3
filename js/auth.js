// js/auth.js

import { translate } from "./lang.js";

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
    alert(translate("userAlreadyExists"));
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
    alert(translate("invalidCredentials"));
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
   UPDATE CURRENT USER
========================= */
export function updateCurrentUser(patch){
  const user = getCurrentUser();

  if(!user) return null;

  const updatedUser = {
    ...user,
    ...patch
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));

  const users = getUsers().map(existingUser =>
    existingUser.id === updatedUser.id ? updatedUser : existingUser
  );

  saveUsers(users);

  return updatedUser;
}

/* =========================
   SETTINGS ROUTE
========================= */
export function getSettingsRoute(user = getCurrentUser()){
  if(!user){
    return "/user/login.html";
  }

  return user.role === "artist"
    ? "/artist/settings.html"
    : "/user/settings.html";
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
    alert(translate("accessDenied"));
    window.location.href = "/";
    return null;
  }

  return user;
}