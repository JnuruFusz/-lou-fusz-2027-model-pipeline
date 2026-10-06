/**
 * Realtime Database keys cannot contain . # $ / [ ]
 * Keep in sync with the helpers in js/firebase.js.
 */

export function firebaseTaskKey(taskId) {
  return String(taskId || "").replace(/[.#$/[\]]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).toUpperCase();
    return `%${hex.length < 2 ? "0" : ""}${hex}`;
  });
}

export function taskIdFromFirebaseKey(key) {
  return String(key || "").replace(/%(2E|23|24|2F|5B|5D)/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function encodeFirebaseMap(map) {
  const encoded = {};
  Object.keys(map || {}).forEach((key) => {
    if (!key) return;
    encoded[firebaseTaskKey(key)] = map[key];
  });
  return encoded;
}

export function decodeFirebaseMap(map) {
  const decoded = {};
  Object.keys(map || {}).forEach((key) => {
    decoded[taskIdFromFirebaseKey(key)] = map[key];
  });
  return decoded;
}
