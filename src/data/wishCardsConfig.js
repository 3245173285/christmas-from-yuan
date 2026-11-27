// 5 Bespoke Reflective Christmas Card Styles + 14 High-Craft SVG Stickers + Starter Cards

export const CARD_STYLES = [
  {
    id: 'parchment',
    name: '复古烫金',
    nameEn: 'VINTAGE GOLD FOIL',
    materialTag: '羊皮纸 · 金属烫金反光',
    swatch: 'linear-gradient(135deg, #f8f0dc 0%, #e7d1a4 55%, #b8893c 100%)',
    miniBg: '#f4e8cd',
    miniBorder: '#c99b49',
    miniAccent: '#8f1f2d',
    miniText: '#332417',
    haloHex: 0xffdf96
  },
  {
    id: 'aurora',
    name: '极光星夜',
    nameEn: 'AURORA HOLOGRAPHIC',
    materialTag: '星夜蓝 · 全息彩虹极光折射',
    swatch: 'linear-gradient(135deg, #0b1b3a 0%, #154e68 52%, #52d9a8 100%)',
    miniBg: '#0d2042',
    miniBorder: '#5ee8c0',
    miniAccent: '#86a6ff',
    miniText: '#e8f6ff',
    haloHex: 0x6ff5d2
  },
  {
    id: 'crimson',
    name: '绯红丝绒',
    nameEn: 'CRIMSON VELVET',
    materialTag: '哑光红丝绒 · 缎面鎏金浮雕',
    swatch: 'linear-gradient(135deg, #5a0b17 0%, #8f1627 58%, #e2b866 100%)',
    miniBg: '#6e1120',
    miniBorder: '#e5be6e',
    miniAccent: '#f8df9c',
    miniText: '#fff3dd',
    haloHex: 0xffb38a
  },
  {
    id: 'ice',
    name: '冰晶霜雪',
    nameEn: 'GLACIAL CRYSTAL',
    materialTag: '冰霜透卡 · 棱镜冰晶锐闪',
    swatch: 'linear-gradient(135deg, #dceeff 0%, #99c9ee 52%, #4a7fb5 100%)',
    miniBg: '#cde6fa',
    miniBorder: '#ffffff',
    miniAccent: '#2b5e8f',
    miniText: '#142d47',
    haloHex: 0xaee4ff
  },
  {
    id: 'emerald',
    name: '松林鎏金',
    nameEn: 'EMERALD LACQUER',
    materialTag: '祖母绿烤漆 · 拉丝黄铜扫光',
    swatch: 'linear-gradient(135deg, #0c2b21 0%, #18513c 55%, #d6b162 100%)',
    miniBg: '#12382a',
    miniBorder: '#dfc075',
    miniAccent: '#f2d996',
    miniText: '#f4efe0',
    haloHex: 0xaef2c2
  }
];

export const CARD_STYLE_MAP = Object.fromEntries(CARD_STYLES.map((s) => [s.id, s]));

// 14 Crisp Vector Stickers for Card Decoration (each renders cleanly with glossy parallax depth!)
export const CARD_STICKERS = [
  {
    id: 'tree',
    label: '圣诞树',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><polygon points="32,6 35,14 43,14 36.5,19 39,27 32,22 25,27 27.5,19 21,14 29,14" fill="#f7cf68"/><path d="M32 16 L18 34 H24 L14 48 H22 L11 58 H53 L42 48 H50 L40 34 H46 Z" fill="#1e6b43" stroke="#114027" stroke-width="1.6" stroke-linejoin="round"/><rect x="28" y="56" width="8" height="6" rx="1.5" fill="#7a4c28"/><circle cx="28" cy="34" r="2.6" fill="#e63946"/><circle cx="37" cy="40" r="2.6" fill="#ffd166"/><circle cx="24" cy="49" r="2.8" fill="#ffd166"/><circle cx="39" cy="51" r="2.8" fill="#e63946"/><circle cx="32" cy="45" r="2.4" fill="#a8dadc"/></svg>`
  },
  {
    id: 'reindeer',
    label: '麋鹿',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M22 24 C17 16 14 10 17 7 M17 14 L11 13 M20 18 L15 20 M42 24 C47 16 50 10 47 7 M47 14 L53 13 M44 18 L49 20" stroke="#6b4426" stroke-width="3.2" stroke-linecap="round" fill="none"/><ellipse cx="18" cy="28" rx="6" ry="3.5" transform="rotate(-24 18 28)" fill="#a87042"/><ellipse cx="46" cy="28" rx="6" ry="3.5" transform="rotate(24 46 28)" fill="#a87042"/><ellipse cx="32" cy="39" rx="15" ry="17" fill="#b87b48" stroke="#7d4f2a" stroke-width="1.5"/><ellipse cx="32" cy="45" rx="10" ry="8" fill="#ebd3b3"/><circle cx="26" cy="35" r="2.4" fill="#231810"/><circle cx="38" cy="35" r="2.4" fill="#231810"/><circle cx="32" cy="43" r="4.5" fill="#d92b3a"/><circle cx="30.5" cy="41.5" r="1.4" fill="#ff9ca6"/></svg>`
  },
  {
    id: 'snowman',
    label: '雪人',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="45" r="14" fill="#f2f8ff" stroke="#b6cfe6" stroke-width="1.6"/><circle cx="32" cy="26" r="10" fill="#ffffff" stroke="#b6cfe6" stroke-width="1.6"/><rect x="21" y="15" width="22" height="3.2" rx="1.5" fill="#243040"/><rect x="24.5" y="7" width="15" height="9" rx="1.8" fill="#243040"/><rect x="24.5" y="12.5" width="15" height="2.6" fill="#d62839"/><path d="M22 33 Q32 38 42 33 L40 37 Q32 41 24 37 Z" fill="#d62839"/><path d="M36 36 L41 44 L36 45 L33 37 Z" fill="#b81d2c"/><circle cx="28.5" cy="24" r="1.7" fill="#1e242b"/><circle cx="35.5" cy="24" r="1.7" fill="#1e242b"/><polygon points="32,26 41,28 32,29.5" fill="#f28c28"/><circle cx="32" cy="43" r="1.9" fill="#243040"/><circle cx="32" cy="49" r="1.9" fill="#243040"/></svg>`
  },
  {
    id: 'bell',
    label: '金铃铛',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 14 C21 14 16 24 15 36 L11 45 H53 L49 36 C48 24 43 14 32 14 Z" fill="url(#bG)" stroke="#9e6d1c" stroke-width="1.6" stroke-linejoin="round"/><defs><linearGradient id="bG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff0b3"/><stop offset="50%" stop-color="#e8b84b"/><stop offset="100%" stop-color="#b57b1c"/></linearGradient></defs><circle cx="32" cy="49" r="5" fill="#c98b24" stroke="#8c5c10" stroke-width="1.4"/><path d="M23 15 C18 8 28 6 32 13 C36 6 46 8 41 15 Z" fill="#c92334"/><circle cx="32" cy="14" r="3" fill="#e63946"/><path d="M23 23 C21 28 20 33 19 38" stroke="#fff7d6" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/></svg>`
  },
  {
    id: 'gift',
    label: '礼盒',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="26" width="38" height="30" rx="3" fill="#b81d31" stroke="#75101d" stroke-width="1.6"/><rect x="10" y="19" width="44" height="9" rx="2.5" fill="#d1263b" stroke="#75101d" stroke-width="1.6"/><rect x="28" y="19" width="8" height="37" fill="#f2ca68"/><rect x="13" y="38" width="38" height="6.5" fill="#f2ca68"/><path d="M32 19 C23 19 17 11 23 8 C28 6 31 13 32 19 C33 13 36 6 41 8 C47 11 41 19 32 19 Z" fill="#f7d881" stroke="#b58324" stroke-width="1.4"/></svg>`
  },
  {
    id: 'gingerbread',
    label: '姜饼人',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="17" r="10.5" fill="#b86c32" stroke="#7d441a" stroke-width="1.6"/><path d="M24 27 L12 31 C9 32 10 38 14 37 L23 35 L20 53 C19 57 25 58 27 54 L32 45 L37 54 C39 58 45 57 44 53 L41 35 L50 37 C54 38 55 32 52 31 L40 27 Z" fill="#b86c32" stroke="#7d441a" stroke-width="1.6" stroke-linejoin="round"/><circle cx="28.5" cy="15.5" r="1.8" fill="#ffffff"/><circle cx="35.5" cy="15.5" r="1.8" fill="#ffffff"/><path d="M28 21 Q32 24.5 36 21" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="32" cy="34" r="2.4" fill="#d92b3a"/><circle cx="32" cy="41" r="2.4" fill="#2a9d5c"/><path d="M15 33 L16 36 M49 33 L48 36 M22 50 L26 51 M42 50 L38 51" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/></svg>`
  },
  {
    id: 'snowflake',
    label: '雪花',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g stroke="#d8f0ff" stroke-width="3" stroke-linecap="round" fill="none"><line x1="32" y1="7" x2="32" y2="57"/><line x1="10.3" y1="19.5" x2="53.7" y2="44.5"/><line x1="53.7" y1="19.5" x2="10.3" y2="44.5"/><path d="M26 14 L32 20 L38 14 M26 50 L32 44 L38 50 M15 29 L22 26 L19 19 M49 35 L42 38 L45 45 M45 19 L42 26 L49 29 M19 45 L22 38 L15 35"/></g><circle cx="32" cy="32" r="5" fill="#ffffff" stroke="#8cc8f0" stroke-width="1.8"/></svg>`
  },
  {
    id: 'candycane',
    label: '拐杖糖',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M24 54 L36 22 C39 14 31 9 25 13 C22 15 21 19 23 22" stroke="#fff9f2" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M24 54 L36 22 C39 14 31 9 25 13 C22 15 21 19 23 22" stroke="#d92638" stroke-width="9" stroke-linecap="round" stroke-dasharray="6 7" fill="none"/><path d="M24 54 L36 22 C39 14 31 9 25 13 C22 15 21 19 23 22" stroke="#851320" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.35"/></svg>`
  },
  {
    id: 'stocking',
    label: '圣诞袜',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M23 16 H44 V38 C44 47 37 54 27 54 H21 C15 54 12 49 14 44 C16 39 20 38 23 36 Z" fill="#c92334" stroke="#7d121d" stroke-width="1.6"/><path d="M14 45 C18 44 21 48 21 54 H20 C15 54 12 49 14 45 Z" fill="#f7d374"/><rect x="20" y="10" width="27" height="10" rx="4.5" fill="#f7f4ec" stroke="#d8cfc0" stroke-width="1.5"/><circle cx="34" cy="28" r="2.2" fill="#f7d374"/><circle cx="38" cy="34" r="1.8" fill="#ffffff"/><circle cx="30" cy="35" r="1.8" fill="#ffffff"/></svg>`
  },
  {
    id: 'star',
    label: '星芒',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><polygon points="32,5 38,24 58,24 42,36 48,56 32,44 16,56 22,36 6,24 26,24" fill="url(#sG)" stroke="#b87e1c" stroke-width="1.6" stroke-linejoin="round"/><defs><linearGradient id="sG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff8d6"/><stop offset="55%" stop-color="#f5c754"/><stop offset="100%" stop-color="#c78820"/></linearGradient></defs><polygon points="32,16 35,27 46,27 37,34 40,45 32,38 24,45 27,34 18,27 29,27" fill="#fff6cc" opacity="0.65"/></svg>`
  },
  {
    id: 'holly',
    label: '冬青果',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 34 C22 28 13 20 8 24 C12 31 11 37 6 42 C16 42 23 44 32 34 Z" fill="#1d6e43" stroke="#0f4227" stroke-width="1.5"/><path d="M32 34 C42 28 51 20 56 24 C52 31 53 37 58 42 C48 42 41 44 32 34 Z" fill="#227d4d" stroke="#0f4227" stroke-width="1.5"/><circle cx="32" cy="31" r="5" fill="#d92132"/><circle cx="26.5" cy="36" r="4.8" fill="#bd1928"/><circle cx="37.5" cy="36" r="4.8" fill="#e62e3f"/><circle cx="30.5" cy="29.5" r="1.4" fill="#ff9ca6"/><circle cx="36" cy="34.5" r="1.3" fill="#ff9ca6"/></svg>`
  },
  {
    id: 'cocoa',
    label: '热可可',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M24 14 Q22 10 25 7 M33 13 Q31 9 34 6 M41 15 Q39 11 42 8" stroke="#e2edf7" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.85"/><path d="M44 26 H50 C55 26 55 43 50 43 H44" stroke="#b82334" stroke-width="4.5" fill="none" stroke-linecap="round"/><rect x="14" y="21" width="32" height="31" rx="6" fill="#c9283a" stroke="#7d1320" stroke-width="1.6"/><ellipse cx="30" cy="22" rx="14" ry="4" fill="#59331e"/><rect x="21" y="18" width="6" height="4.5" rx="1.6" fill="#fffaf2"/><rect x="30" y="19" width="6" height="4.5" rx="1.6" fill="#fffaf2"/><path d="M18 35 H42" stroke="#f5d27a" stroke-width="2.4" stroke-dasharray="4 3"/></svg>`
  },
  {
    id: 'candle',
    label: '暖烛',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 7 C37 14 38 20 32 24 C26 20 27 14 32 7 Z" fill="#ffae34"/><path d="M32 13 C35 17 35 20 32 23 C29 20 29 17 32 13 Z" fill="#fff4bd"/><rect x="22" y="26" width="20" height="28" rx="3" fill="#f7eedb" stroke="#ccb894" stroke-width="1.5"/><path d="M22 30 Q26 35 29 30 Q33 36 37 30 Q40 33 42 30" fill="#fffaf0"/><ellipse cx="32" cy="54" rx="17" ry="4" fill="#c99b44" stroke="#8c6419" stroke-width="1.4"/></svg>`
  },
  {
    id: 'bow',
    label: '蝴蝶结',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M29 33 L18 54 L25 51 L31 36 Z M35 33 L46 54 L39 51 L33 36 Z" fill="#b81a2c"/><path d="M32 30 C19 17 8 22 10 31 C12 39 23 38 32 32 C41 38 52 39 54 31 C56 22 45 17 32 30 Z" fill="#db2338" stroke="#85111f" stroke-width="1.6"/><circle cx="32" cy="31" r="5" fill="#f2c864" stroke="#a6771c" stroke-width="1.4"/></svg>`
  }
];

export const CARD_STICKER_MAP = Object.fromEntries(CARD_STICKERS.map((s) => [s.id, s]));

// Charming initial greeting cards hung on Yuan's tree before friends add even more!
export const DEFAULT_SEED_CARDS = [
  {
    id: 'seed-aurora-1',
    style: 'aurora',
    message: '愿极光穿过漫长冬夜，把最温柔的星光与好运都落在你身旁。圣诞快乐，Yuan！',
    signature: '北欧极光来信',
    stickers: [
      { id: 'star', x: 18, y: 17, scale: 0.95, rot: -10 },
      { id: 'snowflake', x: 83, y: 20, scale: 0.9, rot: 12 },
      { id: 'reindeer', x: 20, y: 80, scale: 1.0, rot: -6 }
    ],
    createdAt: '2026-12-24T20:00:00Z'
  },
  {
    id: 'seed-parchment-2',
    style: 'parchment',
    message: '在这棵会发光的圣诞树下许个愿吧：愿新的一年平安喜乐、万事顺遂，每一天都被温暖包围。',
    signature: '冬日邮差',
    stickers: [
      { id: 'bell', x: 82, y: 18, scale: 0.95, rot: 14 },
      { id: 'holly', x: 19, y: 19, scale: 0.95, rot: -12 },
      { id: 'gift', x: 18, y: 81, scale: 0.95, rot: 6 }
    ],
    createdAt: '2026-12-24T21:15:00Z'
  },
  {
    id: 'seed-crimson-3',
    style: 'crimson',
    message: '热可可冒着白气，壁炉啪嗒作响。点击下方「送贺卡」也可以把你专属的祝福挂上这棵树哦！',
    signature: 'Yuan 的圣诞树',
    stickers: [
      { id: 'tree', x: 81, y: 22, scale: 1.0, rot: 8 },
      { id: 'cocoa', x: 20, y: 80, scale: 0.95, rot: -8 }
    ],
    createdAt: '2026-12-24T22:00:00Z'
  }
];
