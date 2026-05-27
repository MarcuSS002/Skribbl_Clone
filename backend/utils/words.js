const words = [
  "apple", "banana", "orange", "grapes", "watermelon", "pineapple", "strawberry", "mango", "lemon", "peach",
  "house", "castle", "school", "hospital", "bridge", "airport", "library", "museum", "restaurant", "garage",
  "car", "truck", "bicycle", "motorcycle", "airplane", "helicopter", "train", "boat", "submarine", "rocket",
  "dog", "cat", "elephant", "giraffe", "zebra", "monkey", "tiger", "lion", "rabbit", "horse",
  "chair", "table", "sofa", "bed", "lamp", "mirror", "clock", "television", "computer", "phone",
  "pencil", "notebook", "backpack", "scissors", "paintbrush", "camera", "guitar", "piano", "drum", "violin",
  "pizza", "burger", "sandwich", "noodles", "cookie", "cake", "donut", "cheese", "popcorn", "taco",
  "sun", "moon", "star", "cloud", "rainbow", "mountain", "river", "ocean", "island", "volcano",
  "tree", "flower", "cactus", "leaf", "forest", "garden", "mushroom", "pumpkin", "grass", "snowman",
  "shirt", "pants", "dress", "jacket", "hat", "shoes", "glasses", "watch", "crown", "ring",
  "doctor", "teacher", "chef", "artist", "police", "firefighter", "astronaut", "pirate", "wizard", "ninja",
  "baseball", "football", "basketball", "tennis", "soccer", "cricket", "skateboard", "surfboard", "helmet", "trophy",
  "key", "lock", "door", "window", "ladder", "hammer", "wrench", "saw", "magnet", "battery",
  "robot", "alien", "dragon", "ghost", "monster", "treasure", "diamond", "sword", "shield", "map",
  "smile", "heart", "music", "movie", "book", "gift", "balloon", "candle", "umbrella", "toothbrush",
];

function getRandomWords(count) {
  const total = Math.min(Math.max(Number(count) || 3, 1), words.length);
  const shuffled = [...words].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, total);
}

module.exports = {
  words,
  getRandomWords,
};
