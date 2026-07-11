// Icon stamp library — curated Material Symbols (outlined, 400wt) fetched
// from the marella/material-symbols mirror, tinted, rasterized to a PNG
// dataURL and fed into the existing armStamp flow. Fetch is CORS-clean
// (raw.githubusercontent sends ACAO:*); rasterizing from the fetched text
// via a blob URL keeps the canvas untainted.

const ICON_BASE = 'https://raw.githubusercontent.com/marella/material-symbols/main/svg/400/outlined/';

export const iconSvgUrl = (name) => `${ICON_BASE}${name}.svg`;

// name = Material Symbols id (must exist in the set); label feeds search.
export const ICON_STAMPS = [
  { name: 'favorite', label: 'heart love' },
  { name: 'heart_broken', label: 'heartbreak' },
  { name: 'star', label: 'star' },
  { name: 'auto_awesome', label: 'sparkles magic' },
  { name: 'bolt', label: 'lightning bolt' },
  { name: 'local_fire_department', label: 'fire flame' },
  { name: 'skull', label: 'skull death' },
  { name: 'sports_esports', label: 'gamepad gaming controller' },
  { name: 'keyboard', label: 'keyboard' },
  { name: 'mouse', label: 'mouse' },
  { name: 'memory', label: 'chip cpu' },
  { name: 'terminal', label: 'terminal console' },
  { name: 'code', label: 'code dev' },
  { name: 'bug_report', label: 'bug' },
  { name: 'smart_toy', label: 'robot toy' },
  { name: 'rocket_launch', label: 'rocket space' },
  { name: 'public', label: 'globe world earth' },
  { name: 'music_note', label: 'music note' },
  { name: 'headphones', label: 'headphones audio' },
  { name: 'mic', label: 'microphone' },
  { name: 'volume_up', label: 'volume speaker' },
  { name: 'play_arrow', label: 'play media' },
  { name: 'pause', label: 'pause media' },
  { name: 'skip_next', label: 'next track' },
  { name: 'skip_previous', label: 'previous track' },
  { name: 'power_settings_new', label: 'power' },
  { name: 'settings', label: 'gear settings' },
  { name: 'home', label: 'home house' },
  { name: 'search', label: 'search magnifier' },
  { name: 'visibility', label: 'eye view' },
  { name: 'lock', label: 'lock secure' },
  { name: 'key', label: 'key' },
  { name: 'shield', label: 'shield defense' },
  { name: 'pets', label: 'paw pet dog cat' },
  { name: 'cruelty_free', label: 'bunny rabbit' },
  { name: 'dark_mode', label: 'moon dark' },
  { name: 'light_mode', label: 'sun light' },
  { name: 'cloud', label: 'cloud' },
  { name: 'rainy', label: 'rain weather' },
  { name: 'ac_unit', label: 'snowflake frost cold' },
  { name: 'water_drop', label: 'water drop' },
  { name: 'waves', label: 'waves sea' },
  { name: 'air', label: 'wind air' },
  { name: 'eco', label: 'leaf eco plant' },
  { name: 'park', label: 'tree park' },
  { name: 'spa', label: 'flower spa zen' },
  { name: 'diamond', label: 'diamond gem' },
  { name: 'casino', label: 'dice casino' },
  { name: 'extension', label: 'puzzle piece' },
  { name: 'mood', label: 'smiley face happy' },
  { name: 'psychology', label: 'brain mind' },
  { name: 'thumb_up', label: 'thumbs up like' },
  { name: 'waving_hand', label: 'wave hand hello' },
  { name: 'photo_camera', label: 'camera photo' },
  { name: 'videocam', label: 'video camera' },
  { name: 'palette', label: 'palette art color' },
  { name: 'brush', label: 'brush paint' },
  { name: 'draw', label: 'pen draw' },
  { name: 'coffee', label: 'coffee tea cup' },
  { name: 'local_pizza', label: 'pizza food' },
  { name: 'ramen_dining', label: 'ramen noodles' },
  { name: 'cake', label: 'cake birthday' },
  { name: 'fitness_center', label: 'dumbbell gym' },
  { name: 'sports_martial_arts', label: 'karate martial arts' },
  { name: 'flag', label: 'flag' },
  { name: 'emoji_events', label: 'trophy win' },
  { name: 'military_tech', label: 'medal rank' },
  { name: 'science', label: 'flask science lab' },
  { name: 'calculate', label: 'calculator math' },
  { name: 'percent', label: 'percent' },
  { name: 'tag', label: 'hashtag tag' },
  { name: 'alternate_email', label: 'at email' },
  { name: 'attach_money', label: 'dollar money' },
  { name: 'currency_bitcoin', label: 'bitcoin crypto' },
  { name: 'warning', label: 'warning alert' },
  { name: 'help', label: 'question help' },
  { name: 'info', label: 'info' },
  { name: 'check_circle', label: 'check done' },
  { name: 'cancel', label: 'cancel x' },
  { name: 'north', label: 'arrow up north' },
  { name: 'south', label: 'arrow down south' },
  { name: 'east', label: 'arrow right east' },
  { name: 'west', label: 'arrow left west' },
  { name: 'sync', label: 'sync refresh' },
  { name: 'schedule', label: 'clock time' },
  { name: 'timer', label: 'timer stopwatch' },
  { name: 'hourglass_empty', label: 'hourglass wait' },
  { name: 'notifications', label: 'bell notification' },
  { name: 'celebration', label: 'party confetti' },
  { name: 'fingerprint', label: 'fingerprint identity' },
  { name: 'anchor', label: 'anchor nautical' },
  { name: 'sailing', label: 'sailboat sea' },
  { name: 'flight', label: 'plane flight' },
  { name: 'directions_car', label: 'car drive' },
  { name: 'two_wheeler', label: 'motorbike motorcycle' },
  { name: 'pedal_bike', label: 'bicycle bike' },
  { name: 'landscape', label: 'mountain landscape' },
];

// Fetch + tint + rasterize an icon into a PNG dataURL sized for stamp decals.
export async function iconToDataUrl(name, tint = '#ffffff', size = 320) {
  const res = await fetch(iconSvgUrl(name));
  if (!res.ok) throw new Error(`icon ${name}: HTTP ${res.status}`);
  let svg = await res.text();
  // Material Symbols SVGs carry no fill (default black) — tint at the root.
  svg = svg.replace('<svg ', `<svg fill="${tint}" `);
  const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = blobUrl; });
    const c = document.createElement('canvas');
    c.width = c.height = size;
    c.getContext('2d').drawImage(img, 0, 0, size, size);
    return c.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
