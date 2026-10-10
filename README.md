# Rock 'n' Roll Zombies

**Turn it up to 11 and dead the undead.**

Made by One Mad Punk.

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
- **Scoreboards:** high scores and fastest clear time per gig, on this device and worldwide (filter the fastest times by character). Share a challenge link with a friend.
- **Special moves:** Punk wall jump (push into a wall in mid-air, then Jump), Drummer double jump (Jump in the air), Singer glide (hold Jump while falling), Bassist slide tackle (Down while running), Roadie barges through crew barricades.
- **Secret areas:** two per gig, behind cracked walls with a faint light in the cracks. Shoot the wall, then Up at the door.
- **Two routes:** every gig has a high route (walkways, rigging, girders: faster, flyers, most of the platinum records) and a low route (zombies rising from the ground, barricades, pits).
- **Hell Bats:** winged demons that hover out of reach, dodge your shots and swoop on the beat.
- **Jukeboxes:** passing one saves your spot; shooting one first smashes it for cash, but then it won't save anything.
- **Dropped cash:** die and half your cash drops in a glowing bag where you fell. Grab it back before you die again.
- **Demo tapes:** one hidden on each gig's high route. Each unlocks that gig's songs in the Jukebox menu.
- **Stage dive:** hold Down in mid-air to bounce off zombies' heads. On the beat it hits twice as hard.
- **Gold jacket:** from "?" flight cases and Hell Bats. Hold Throw to charge a super attack: Punk power chord, Drummer drum roll, Bassist big vinyl, Singer high note (all around you), Roadie tool storm (both ways). One hit knocks it off.
- **"?" flight cases:** a gamble. Usually gold, sometimes the gold jacket, sometimes a rubber-duck curse for 5 seconds (slower, lower jumps, can only quack).
- **Rick Rotten:** a zombie guitarist on the Devil's payroll who crashes the end of every ambush, tougher each gig.
- **The true ending:** find all five demo tapes, then beat the Devil. Someone else has been pulling the strings...
- **Outfits and Collection:** platinum records, secret areas and beating the Devil unlock outfits; the Collection screen shows what's left to find.
- **Settings:** music and sound volume, flashing, shake, full screen, graphics quality.

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
