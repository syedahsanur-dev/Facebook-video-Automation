/**
 * Minimal JSON-file store so the app runs with zero setup.
 *
 * IMPORTANT: On Vercel (and most serverless hosts) the filesystem is
 * read-only except /tmp, and /tmp is wiped between cold starts / not
 * shared across function instances. That means this store works for a
 * single quick local test, but is NOT reliable once more than one person
 * uses the app or the deployment restarts.
 *
 * Before real use, swap readDB/writeDB below for a real database call
 * (Vercel KV, Upstash Redis, Supabase, MongoDB Atlas — pick one, it's a
 * ~20 line change since everything else calls only saveUser()/getUser()).
 */
const fs = require("fs");
const path = require("path");

const isServerless = !!process.env.VERCEL;
const DB_PATH = isServerless
  ? path.join("/tmp", "data.json")
  : path.join(__dirname, "..", "data.json");

function readDB() {
  if (!fs.existsSync(DB_PATH)) return { users: {} };
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return { users: {} };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function saveUser(fbUserId, payload) {
  const db = readDB();
  db.users[fbUserId] = { ...(db.users[fbUserId] || {}), ...payload };
  writeDB(db);
  return db.users[fbUserId];
}

function getUser(fbUserId) {
  const db = readDB();
  return db.users[fbUserId] || null;
}

module.exports = { saveUser, getUser };
