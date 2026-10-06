/* ── THE APPROVED BACKLINE — Devcon 8 Mumbai · JIO World Convention Centre ──
   25 line items, exactly as approved. Order = the rider's own order.
   zone: 'dj' | 'amped' | 'hands' | 'floor' | 'ops'
   ------------------------------------------------------------------------- */
export const ITEMS = [
  { id: 'drumkit',    n: 1,  name: 'Electric Drum Kit',        spec: 'Backline · pads + module · quiet-hours friendly', zone: 'amped', emoji: '🥁', voice: 'drumkit', hint: 'click the pads' },
  { id: 'strat',      n: 2,  name: 'Fender American Ultra II HSS Strat', spec: 'Electric guitar + amp', zone: 'amped', emoji: '🎸', voice: 'strat' },
  { id: 'twin',       n: 3,  name: "Fender Twin Reverb '65",    spec: 'Amp · 2×12 · the spring tank', zone: 'amped', emoji: '🔊', voice: 'twinreverb', note: 'An amp has its own voice: hum, and that tank.' },
  { id: 'taylor',     n: 4,  name: 'Taylor 214ce Deluxe Black', spec: 'Acoustic guitar · electro-acoustic', zone: 'hands', emoji: '🎻', voice: 'taylor' },
  { id: 'bass',       n: 5,  name: 'Markbass 800 + 104 CAB',    spec: 'Bass guitar + head & 4×10 cab', zone: 'amped', emoji: '🎚️', voice: 'bass' },
  { id: 'clp785',     n: 6,  name: 'Yamaha CLP-785',            spec: 'Electric piano · graded hammer', zone: 'amped', emoji: '🎹', voice: 'clp785' },
  { id: 'montage',    n: 7,  name: 'Yamaha Montage M6',         spec: 'Synthesizer · 61 keys', zone: 'amped', emoji: '🎛️', voice: 'montage' },
  { id: 'impulse',    n: 8,  name: 'Novation Impulse',          spec: 'MIDI controller', zone: 'amped', emoji: '⌨️', voice: 'impulse', note: "A controller makes no sound of its own — so it plays the Montage." },
  { id: 'drummachine',n: 9,  name: 'BOSS Drum Machine',         spec: 'Drum machine · 16 steps', zone: 'amped', emoji: '🔲', voice: 'drumloop', toggle: true, hint: 'toggles a loop' },
  { id: 'djembe',     n: 10, name: 'Remo 12" Djembe',           spec: 'Hand percussion', zone: 'hands', emoji: '🪘', voice: 'djembe' },
  { id: 'cajon',      n: 11, name: 'Pearl Cajon',               spec: 'Box drum · 1', zone: 'hands', emoji: '📦', voice: 'cajon' },
  { id: 'congas',     n: 12, name: 'LP Matador Congas',         spec: 'Conga set · quinto / conga / tumba', zone: 'hands', emoji: '🪘', voice: 'congas' },
  { id: 'tambourine', n: 13, name: 'Meinl Tambourine & Shakers',spec: 'Hand percussion · pass it around', zone: 'hands', emoji: '🔔', voice: 'tambourine' },
  { id: 'kartal',     n: 14, name: 'Kartal',                    spec: 'Hand clappers with jingles · folk Rajasthan/Gujarat', zone: 'floor', emoji: '🪵', voice: 'kartal' },
  { id: 'manjira',    n: 15, name: 'Manjira',                   spec: 'Small bronze cymbals · bhajan & kirtan', zone: 'floor', emoji: '🎼', voice: 'manjira' },
  { id: 'shruti',     n: 16, name: 'Shruti Box',                spec: 'Bellows drone box', zone: 'floor', emoji: '🌬️', voice: 'shruti', toggle: true, hint: 'toggles the drone' },
  { id: 'harmonium',  n: 17, name: 'Harmonium — Dutta & Co',    spec: 'Scale-change harmonium', zone: 'floor', emoji: '🪗', voice: 'harmonium', altVoice: 'harmoniumDrone', hint: 'click = phrase · long-press = drone' },
  { id: 'tabla',      n: 18, name: 'Tabla — set of 2',          spec: 'Dayan + bayan', zone: 'floor', emoji: '🥁', voice: 'tabla', altVoice: 'tablaTheka', hint: 'click = bol · long-press = theka' },
  { id: 'bansuri',    n: 19, name: 'Bansuri — F bass scale',    spec: 'Bamboo flute', zone: 'floor', emoji: '🎶', voice: 'bansuri' },
  { id: 'dhol',       n: 20, name: 'Punjabi Bhangra Dhol',      spec: 'Mango wood · two heads', zone: 'hands', emoji: '🪘', voice: 'dhol', altVoice: 'bhangra', hint: 'click = hit · long-press = bhangra' },
  { id: 'kanjira',    n: 21, name: 'Kanjira',                   spec: 'Frame drum · South Indian', zone: 'floor', emoji: '🔸', voice: 'kanjira' },
  { id: 'dholak',     n: 22, name: 'Dholak',                    spec: 'Folk barrel drum', zone: 'hands', emoji: '🪘', voice: 'dholak' },
  { id: 'cdj',        n: 23, name: 'CDJ-3000 ×2 + DJM-A9',      spec: 'DJ system', zone: 'dj', emoji: '💿', voice: 'deckA', altVoice: 'deckB', toggle: true, hint: 'deck A · long-press = deck B' },
  { id: 'ledtable',   n: 24, name: 'DJ LED Console Table',      spec: 'Booth · programmable LED front', zone: 'dj', emoji: '✨', voice: 'console', hint: 'cycles the LED mood' },
  { id: 'cables',     n: 25, name: 'Cables, Signals & Accessories', spec: 'The unglamorous hero of every stage', zone: 'ops', emoji: '🔌', voice: 'cables', note: 'No cable, no circle. This line item is the one that makes the other 24 real.' },
];

export const EXTRA = [
  { id: 'pa', name: 'PA — four quadrant tops', spec: 'Sound in the round · mono-compatible, aimed outward from the circle', zone: 'ops', emoji: '📣', voice: 'pa', hint: 'soundcheck sweep' },
];
