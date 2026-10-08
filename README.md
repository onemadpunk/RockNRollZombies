# Rock 'n' Roll Zombies

A Ghosts 'n Goblins-style 2.5D platformer where the music is the game clock.
Level 1: **The Graveyard Gig**. Rescue the drummer from the Bouncer.

## Play it
Double-click **Play Rock n Roll Zombies.html** (or the "Rock n Roll Zombies" shortcut on the Desktop).
It needs an internet connection, because it loads the 3D engine (Three.js) and fonts online.

## Working on the code
The game code lives in `js/`. After changing anything, rebuild the double-clickable file:
```
python build.py
```
For quick testing while editing, `python serve.py` serves the unbundled version at http://localhost:8080.

## Controls
| | Keyboard | Controller | Touch |
|---|---|---|---|
| Move | Arrows / A D | Stick / D-pad | ◀ ▶ |
| Jump | Space / Z / W | A | JUMP |
| Throw | X / J | X / B / RB | THROW |
| Crouch | Down / S | Down | ▼ |
| Drop through ledge | Down + Jump | | |
| Guitar solo | C / L / Shift | Y / LB | SOLO |
| Pause | Esc / P | Start | II |

## Rules
- **Leather jacket = armor.** First hit knocks it off; second hit and you're bones. Find a new jacket in a flight case.
- **Throw on the beat** for double damage, a power chord, and a combo. Combo 4+ brings the drums in, 10+ adds the lead guitar, and every 5 combo multiplies kill points. An off-beat throw resets the combo.
- **Guitar solo:** on-beat throws and kills fill the SOLO meter. When it's full, press C to windmill a power chord that wipes out everything on screen.
- **Amps:** jump off an amp *on the beat* for a super jump (there's a secret ledge in the storm).
- **Coffins** over the pits rise and slide in time with the music.

## The level
1. **Cemetery Gates**: walkers and crows.
2. **Open Graves**: zombie hands burst from the ground, crawlers (duck to hit them), coffin platforms over pits.
3. **The Churchyard**: ghosts that fade out on beats 3 and 4, headbangers, the jukebox checkpoint.
4. **The Storm**: rain and lightning, grave diggers throwing skulls (shoot them down), pogo punks, the amp jump to the secret ledge.
5. **The Mosh Pit**: the camera locks and you survive three waves.
6. **The Bouncer**: stomps (jump the shockwaves), headstones, and a charge (get up on a ledge; he's dizzy after hitting the wall and takes double damage). At half health he gets angry and calls in security.

Weapons from flight cases: picks, drumsticks (arc), vinyl (boomerang), flaming guitar (leaves fire on the ground). You finish with a rank from S to D.

## Files
- `js/main.js`: renderer, bloom, lights, camera, screens, main loop
- `js/game.js`: player, weapons, enemies, boss, pickups
- `js/level.js`: the graveyard scenery and level layout (`LAYOUT` at the top is easy to edit)
- `js/models.js`: the punk, zombies, crow and props, built from 3D primitives
- `js/audio.js`: the synthesized soundtrack and sound effects
- `js/input.js`: keyboard, gamepad and touch

Debug in the browser console: `rnrz.game` (game state), `rnrz.game.p.x = 190` (jump ahead).
