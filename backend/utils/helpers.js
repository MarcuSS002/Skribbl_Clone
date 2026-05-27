const { customAlphabet } = require("nanoid");

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nanoid = customAlphabet(alphabet, 6);

function generateRoomId() {
  return nanoid();
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(number)));
}

function cleanText(text, maxLength) {
  if (typeof text !== "string") {
    return "";
  }

  return text.trim().slice(0, maxLength);
}

function isNormalizedPoint(payload) {
  return (
    payload &&
    Number.isFinite(Number(payload.x)) &&
    Number.isFinite(Number(payload.y)) &&
    Number(payload.x) >= 0 &&
    Number(payload.x) <= 1 &&
    Number(payload.y) >= 0 &&
    Number(payload.y) <= 1
  );
}

module.exports = {
  generateRoomId,
  clampNumber,
  cleanText,
  isNormalizedPoint,
};
