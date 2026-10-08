# Rock 'n' Roll Zombies

**Turn it up to 11. Dead the undead.**

A Ghosts 'n Goblins-style 2.5D platformer where the music is the game clock. The Devil has dragged your band
to Hell: play five gigs, rescue your bandmates and win your soul back in a guitar duel.

## Play it
- **Online:** https://rocknrollzombies.com/
- **Install as an app:** tap **Install app** on the title screen (Android/Chrome), or in Safari tap
  Share → **Add to Home Screen** (iPhone). Open it once with a signal and it plays offline after that.
  Scores set offline go to the world scoreboard the next time you're online.
- **On this computer:** double-click **Play Rock n Roll Zombies.html** (needs a connection for the 3D engine and fonts).

## The tour
1. **The Graveyard Gig**: rescue the Drummer from the Bouncer.
2. **The Back Alley Dive Bar**: up the fire escapes and across the rooftops to the Gargoyle Punk. Rescue the Bassist.
3. **The Haunted Festival**: mud, campfires, porta-loos, the Ferris wheel and the Banshee Diva. Rescue the Singer.
4. **The Highway to Hell**: lava under a broken bridge, hearses on Route 666, and the Disco Mummy. Rescue the Roadie.
5. **Hell's Stadium**: climb the stands, jump the amps, then a guitar duel with the Devil.

Each rescued bandmate becomes playable. Each gig hides three platinum records.

## Controls
| | Keyboard | Controller | Touch |
|---|---|---|---|
| Move | Arrows / A D | Stick / D-pad | Joystick (left thumb) |
| Jump | Space / Z / W | A | JUMP |
| Throw | X / J | X / B / RB | THROW |
| Climb ladders | Up / W, Down / S | D-pad up / down | Joystick up / down |
| Crouch | Down / S | Down | Joystick down |
| Drop through ledge | Down + Jump | | |
| Guitar solo | C / L / Shift | Y / LB | SOLO |
| Pause | Esc / P | Start | II (top of screen) |

## Rules
- **Leather jacket = armor.** First hit knocks it off; second hit and you're bones.
- **Throw on the beat** for double damage and a combo. The ring at your feet flashes on the beat.
- **Guitar solo:** on-beat throws fill the SOLO meter; when full, wipe out everything on screen.
- **Checkpoints:** the jukebox (and each zone on Easy/Normal). Continue after a Game Over starts from your last checkpoint.
- **Scoreboards:** high scores and fastest clear time per gig, on this device and worldwide. Share a challenge link with a friend.

## Working on the code
The game code lives in `js/`. After changing anything, rebuild the double-clickable file:
```
python build.py
```
For testing while editing, `python serve.py` serves the unbundled version at http://localhost:8080.
The world scoreboard setup is in `SETUP-ONLINE.md`. A play-test bot lives in `tools/bot.js`.

- `js/main.js`: renderer, camera, screens, scoreboards, main loop
- `js/game.js`: players, weapons, enemies, bosses, pickups, the beat rules
- `js/level1.js` … `js/level5.js`: each gig's layout and scenery; `js/levelkit.js` holds the shared parts
- `js/models.js`: heroes, zombies, bosses and props, built from 3D primitives
- `js/audio.js`: the synthesized soundtrack and sound effects
- `js/input.js`: keyboard, gamepad and touch
- `sw.js` + `manifest.webmanifest`: install-as-app and offline play

Debug in the browser console: `rnrz.game` (game state), `rnrz.loadLevel(n)` (jump to a gig, 0–4).
