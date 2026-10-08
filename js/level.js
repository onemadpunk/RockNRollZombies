// Level registry + the tour (all the gigs, built or not yet).
import { LEVEL1 } from './level1.js';
import { LEVEL2 } from './level2.js';
import { LEVEL3 } from './level3.js';
import { LEVEL4 } from './level4.js';

export const LEVELS = [LEVEL1, LEVEL2, LEVEL3, LEVEL4];

export const TOUR = [
  { name: 'Graveyard Gig', boss: 'The Bouncer', rescue: 'Drummer' },
  { name: 'Back Alley Dive Bar', boss: 'The Gargoyle Punk', rescue: 'Bassist' },
  { name: 'Haunted Festival', boss: 'Banshee Diva', rescue: 'Singer' },
  { name: 'Highway to Hell', boss: 'Disco Mummy', rescue: 'Roadie' },
  { name: "Hell's Stadium", boss: 'The Devil', rescue: 'Your soul', soon: true },
];

export function buildLevel(index, scene, quality) {
  const L = LEVELS[index];
  const world = L.build(scene, quality);
  world.L = L;
  return world;
}
