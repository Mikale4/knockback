# KNOCK//BACK

A voxel arena fighter where the fighters are **action figures** of famous warriors — Samurai, Knight, Pirate, Monk,
Viking, Ninja, Summoner, Paladin, Dragoon, Bard — and every figure is six snap-on parts you can mix freely.

**The gimmick is the name:** launch someone into a wall and they **bounce back off it**, still helpless, so you can keep
the combo going and knock them back into the wall again. The ways out of that loop are taken from Guilty Gear.

**Play:** https://mikale4.github.io/knockback/ (keyboard, any controller, or touch). Your collector and collection are saved in your browser.

## Run it locally

Open `index.html` through any static server, for example:

```
python tools/serve.py 8766
```

then visit http://localhost:8766. (The server sends no-cache headers so edits show up on reload.) No build step;
plain JavaScript and Three.js (`lib/three.min.js`).

**Publishing:** pushing to `main` updates the GitHub Pages site. Run `python tools/bump.py` first: it stamps the
game's scripts and stylesheet in `index.html` with a new `?v=` (and `sw.js` with the same version), because GitHub
Pages lets browsers keep a file for 10 minutes (phones sometimes longer) and a player could otherwise get the new page
with old scripts.

**Install and offline:** the game installs as an app (`manifest.webmanifest`, icons in `icons/`, drawn by
`python tools/make_icons.py`): an icon on the home screen or desktop, full screen, and it plays offline once it has
loaded (online rooms still need the internet). OPTIONS has the INSTALL button where the browser offers it (Chrome,
Edge, Android), or the steps for an iPhone or iPad (Share, then Add to Home Screen). `sw.js` is the offline copy (a
service worker): the page always comes from the network when there is one, so a new version shows up on the next
load; the stamped files are served from the copy; a new version clears the old copy. It isn't used on the local test
server (every edit has to show up at once); add `?sw=1` to the address to test it there.

**Graphics (OPTIONS):** AUTO (MEDIUM on phones and tablets, HIGH on computers, and it steps down a level by itself if a
fight can't hold ~50 fps), HIGH, MEDIUM or LOW: the resolution, the shadows and how many particles effects throw (looks
only; the fight plays the same at every level). SHOW FPS puts a counter in the corner. On phones the screen doesn't dim
or lock in the middle of a fight.

## Controls

| Action | Keyboard P1 | Keyboard P2 | Xbox | PlayStation |
|---|---|---|---|---|
| Move | Arrow keys | I J K L | Left stick / d-pad | Left stick / d-pad |
| Light (R-ARM string) | Z | Num 1 or `,` | X | □ |
| Heavy / KNOCK (L-ARM) | X (hold to charge) | Num 2 or `.` | Y | △ |
| Guard (+ Light = Grab) | C | Num 3 or `/` | RB | R1 |
| Head Special | A | Num 5 or `;` | LB | L1 |
| Snap Cancel / Spring Burst | D | Num 4 or `'` | RT | R2 |
| Legend Art (super) | S | Num 6 or `]` | LT | L2 |
| Part Toss | F | Num 7 or `[` | RS (click) | R3 |
| Jump | Space | Num 0 or R-Shift | A | ✕ |
| Dodge / Tech | L-Shift | Num . or `\` | B | ○ |
| Down Dash (in the air) | Guard + Dodge | Guard + Dodge | RB + B | R1 + ○ |
| Pause / move list | Esc | | Menu | Options |

**Everything can be rebound in Options.** Each action takes two keys per player (a key that already does something
swaps over). Every controller button can be rebound too: click the slot and press the button.

**Controllers:** Xbox, PlayStation and Switch pads are recognised and every prompt (the move list, Options) shows that
pad's own buttons. Any other PC controller works as well; its d-pad hat is read even when the browser doesn't map it,
and if its buttons land in odd places, rebind them. In one-player modes every connected pad controls Player 1; in
two-player versus the first pad is P1 and the second P2 (**Swap** in Options). There's a stick deadzone setting, a
live button tester, and the whole menu can be driven with a pad: d-pad or stick to move, the bottom button to choose,
the right button to go back.

**On a phone or tablet** you get on-screen controls in every fight: a floating stick under your left thumb (it appears
wherever you touch the left half of the screen) and the eight buttons on the right, each held while touched, so you
can charge a Heavy or hold GUARD and tap LIGHT to throw. SUPER glows at 100 Hype; SNAP turns into BURST when you can
burst; SPECIAL shows its uses left. The pause button is at the bottom (at the top in portrait). Landscape gives the best
view; on Android the game goes fullscreen and holds landscape when you tap the title. Menus fit portrait and landscape.

## The fighting system

- **Combos:** Light string → Heavy = **Launcher** (Jump to follow, air Lights, air Heavy spikes for a ground bounce).
  Light string → *toward* + Heavy = the **KNOCK** instead, straight back into the wall. Dodge → Light is the legs'
  dash attack. Hitting someone as they start a move is a **COUNTER**.
- **KNOCK//BACK (wall bounce):** a tumbling figure that hits a wall fast enough bounces back off it in hitstun. Each
  bounce in a combo hits harder. Hold a direction as a launcher lands to aim it.
- **Wall stress and WALL BREAK:** bounces crack the wall (cracks spread and glow; the wall map under the timer shows
  all four). At full stress, or on a 4th bounce in one combo, the wall **breaks**: big damage, the target flies out of
  the arena (**RING OUT**, -8% HP, they drop back in), the attacker gets **MOMENTUM** (+10% damage, faster Hype). The
  wall snaps back together after a few seconds.
- **Breakers (the Guilty Gear part):**
  - **Spring Burst** — Snap while being hit, with a full Burst gauge: blow the attacker away. A guarding attacker
    blocks it, so it can be baited.
  - **Wall Tech** — from the 2nd bounce of a combo, press Dodge just before you reach the wall to kick off it.
    Mashing locks you out briefly.
  - **Combo decay** — every hit is worth less (shown as % VALUE), hitstun shortens and gravity grows the longer a
    combo runs; past ~5.5 s the target recovers on its own.
  - **Recover** (any button once hitstun ends in the air), **Quick Rise** (Dodge as you land), **Just Guard** (guard
    at the last moment: no chip, attacker shoved), **Guard Crush** when the guard gauge empties, **Throw tech**.
- **Snap Cancel** — Snap during your own move with 50 Hype: cancel its recovery to extend a combo.
- **Grabs** (Guard + Light, beats guard) — you hold them. **Light** pummels (each one counts in the combo), and then
  you throw: **tilt the stick** (or Heavy + a direction) to throw them that way (behind you is the strongest, a spin
  throw), **Jump** throws them straight up for a juggle, **Heavy** alone **slams** them into the floor for a ground
  bounce. Throw them at a wall and they bounce off it like any KNOCK. The one being held can **mash** to break free
  (GRAB BREAK); the more hurt they are, the longer you can hold them.
- **OTG (off the ground)** — twice a combo, a hit can pick a knocked-down opponent back up off the floor ("OTG!", then
  "OTG 2!", which pops them a little lower and for less time): a
  Heavy, a dash attack, a dive (air Heavy), a sweep or a downward shot. They're scooped into the air and the combo
  carries on. Quick Rise (Dodge as you land) gets out of it.
- **Down Dash** — in the air, hold Guard and press Dodge: a dive straight to the floor, steered with the stick. It uses
  your air dodge and has no invincibility (it's for getting down fast); you can act the moment you land.
- **Part Toss** (its own button: F, or click the right stick) — pull a part off your own figure and throw it: the head first, then the L-arm, then
  the R-arm. It works as a cancel off any hit. A toss that lands **extends the combo** ("EXTEND 1/2"): its clock and
  decay start over, and you get a fresh OTG and ground bounce. Twice a combo at most: combo, toss, combo, toss, final
  combo. The part lands on the floor; go and snap it back on (before they take it, see Parts).

## Legend Arts (supers)

100 Hype. The screen freezes for the flash, then the Art tries to **catch** — each in its own way — and if it does,
it plays a **full cinematic**: black bars, its own camera shots, and the last blow lands with a freeze, a flash and
its name. The clock and the CPUs wait while it plays. Its camera never looks through a wall: near one, a shot moves in
just inside it (or swings round to the side with room), and the flash's close-up picks the side of the figure that's
open.

| Art | Catches by | The cinematic |
|---|---|---|
| Thousand Cuts (Samurai) | a dash through them | ten blinks around them, a turn of the back, the blade slides home and every cut lands at once |
| Holy Lance Charge (Knight) | an armoured charge | carries them into the wall, then a column of light |
| Broadside (Pirate) | a signal shot that finds them | "FIRE!", a rain of cannonballs, then one the size of a barrel |
| Hundred Hands (Monk) | a lunge to close the gap | an ever-faster flurry, a breath, the palm |
| **Ragnarök** (Viking) | **a leap that homes in on them wherever they go**: fate can't be dodged or outrun | the sky goes red, lightning, the leap, the world-ending slam |
| Shadow Clone Arts (Ninja) | a dash through them | clones cut through, ring them, and strike all at once |
| Grand Summoning (Summoner) | a circle that opens under them | chains of light, her imps pile on, a giant imp rises and belly-flops them |
| Judgment of Dawn (Paladin) | a burst of light around her | a beam lifts them, wings of light, the hammer comes down like the dawn |
| Dragonfall (Dragoon) | a leap out of sight, a reticle that locks on, the dive; **it OTGs**: it pins them even lying down or getting up | skewered, carried up, three dives, and the spirit dragon's own |
| Grand Finale (Bard) | a ring of sound rolling outward | the lights go down, spotlights, they dance to every beat, then the lute comes down for the encore |

## Every line fights its own way

Your R-ARM decides your string, its **pause branch** (let a move finish, wait a beat, press Light again), your air
string and a signature; your stance comes from it too.

| Line | Light string | Pause branch | Air string | Signature |
|---|---|---|---|---|
| Samurai (Katana) | Kiri › Kesa › Tsuki › Rising Cut (launches up) | Issen: dash through them, knock them back the other way | Kiri › Kesa › Tsubame Gaeshi (2-hit spike) | **Kaeshi**: Light right after a Just Guard is a crumpling riposte |
| Knight (Longsword) | Cleave › Backswing › Judgment (ground-bounce slam) | Pommel Strike (crumple) | Cleave › Plunging Thrust (dive) | **Steadfast**: armour in the startup of every swing after the first |
| Pirate (Cutlass) | Cut › Backcut › Flourish (spin) › Boot to the Face | Sand in the Eyes (dizzy) | Cut › Backcut › Cannonball (dive) | **Dirty Fighting**; with the Flintlock, Heavy mid-string is a **Quick Shot** gun cancel |
| Monk (Fists) | Jab › Cross › Hundred Fists (mash to extend) › Dragon Palm | Leg Sweep (launcher) | Knee › Spin Kick › Whirlwind Kick | **Flow**: moves speed up as a combo goes on |
| Viking (Axe) | Hack › Hew › Whirlwind (hits all around) | Skull Splitter (ground bounce) | Chop › Axe Drill (spinning dive) | **Wind-up**: hold Light on any swing for armour against one hit, +45% damage, a crumple |
| Ninja (Tantō) | Flick › Backflick › Vanishing Stab (blinks behind, once a combo) › Shadow Slash | Kunai Toss | Flick › Backflick › Kunai Rain | **Shadow Dash**: Dodge after an air hit to dash at them |
| Summoner (Staff) | Staff Jab › Staff Swing › Sic 'Em (every imp attacks) › Conjure Bolt | Call Imp | Swing › Spirit Bolt (spike) | **Pack Tactics**: her imps pounce on anyone she hits |
| Paladin (Warhammer) | Smite › Hammer Fall › Consecrate (holy shockwave all around) | Hallowed Strike (crumples, heals big) | Smite › Meteor Hammer (dive) | **Lay on Hands**: string hits heal her |
| Dragoon (Lance) | Thrust › Twin Thrust › Wheel Sweep › Rising Lance | Impaling Lunge | Thrust › Dragon Dive | **Skyborne**: Jump off an air hit for a fresh jump and air string |

**The Dragoon throws his lance** (Guard + Heavy, on the ground or in the air): it flies flat and fast at them (60
damage) and stays where it lands, planted in the floor or lying by a wall. Until he walks over it and picks it up
("LANCE!") he fights with his fists (Gauntlet Jabs and a Shoulder Check; his two-handed lance Heavies become a
Tackle, a Headbutt and a Body Drop). His Legend Art calls it back, and so does a new round or losing the arm. **His
Dragon Breath sets them BURNING**: a tick of damage every half second for 3 s (it can't take the last point).
| Bard (Lute) | Strum › Twang › Power Chord › Encore! | Lullaby (puts them to sleep) | Strum › Crescendo | **On the Beat**: start a Light on the music's beat for +30% damage |

**The Summoner's imps** come from her Special (two at a time), the Call Imp pause branch, and the FAMILIAR legs (one
at the start of every round). They walk in and bite, pounce on whatever she hits, and all go in at once on Sic 'Em.
She keeps **two at most** (a new one replaces the oldest). Any attack that touches one hurts it: **two hits** pop it,
and otherwise each one **leaves after 5 seconds** (it blinks in its last second). The LEGION card makes them bite 30%
harder.

**Projectiles** fly as real things you can see: the Pirate's pistol ball (with a muzzle flash and a kick up the arm),
the Ninja's kunai (they stick in walls), the Summoner's spirit bolts and her Hex glyph, the Bard's sound waves with
notes riding on them, and the Ninja's **Chain Hook** (the weighted chain flies out, whips round them, and the Ninja
yanks them in along the floor; twice in any 5 s, and a third try says how long to wait). Projectiles stop short of
the walls (the chain's weight, the hex glyph and the Bard's sonic boom burst or clank before them). Every one is aimed: it leads a moving target, finds them high, low or on the floor,
and the Part Toss homes in. The Ninja's **Shadow Step** works twice a round, 3 seconds apart.

## Mixed strings (every pair of arms has its own)

Put an R-arm and an L-arm from **different lines** on one figure and they make a string of their own. The R-arm
opens with its first two hits, the L-arm's weapon cuts in, the R-arm's third hit follows if it has one, and it ends
in a **hybrid finisher** that swings both arms. The finisher is named for the R-arm's weapon and does what the
L-arm's line does. The air string ends in a hybrid air finisher the same way. Ten lines make **90 pairings**: 90
mixed strings, 90 finishers and 90 air finishers, each its own. A pure pair (both arms from one line) keeps that
line's own string, and losing the L-arm drops you back to the R-arm's own string.

| L-arm line | Cuts in with | Finisher (ground / air) | What it does |
|---|---|---|---|
| Samurai | Kote Strike | Severance / Moonfall | big hit that crumples them / a spike |
| Knight | Shield Check (armour) | Rampart / Bulwark Drop | a long KNOCK into the wall / a diving spike |
| Pirate | Pistol Pop (a shot) | Cannonade / Powder Dive | an explosion that launches / an explosive spike |
| Monk | Thunder Jab (2 hits) | Tempest / Storm | a four-hit flurry |
| Viking | Boss Smash (armour) | Quake / Meteor | slams them into the floor for a ground bounce |
| Ninja | Chain Lash (drags them in) | Eclipse / Shadowfall | blinks behind them first |
| Summoner | Hex Spark (imps pounce) | Hexbloom / Spiritfall | a hex burst, every imp pounces, up into a juggle |
| Paladin | Holy Bash (heals) | Daybreak / Sunfall | holy shockwave all round, heals you |
| Dragoon | Gauntlet Hook | Updraft / Skyrend | sends them sky-high for an air combo |
| Bard | Tambourine Slap (notes) | Refrain / Fortissimo | leaves them dizzy / a three-hit chord |

So a Viking axe with a Pirate flintlock goes **Hack › Hew › Pistol Pop › Axe Cannonade**, and in the air
**Air Chop › Axe Powder Dive**. The move list (pause, or MOVE LIST in the Workshop) shows your figure's.

## Parts (the Medabots-style build system)

| Slot | What it gives |
|---|---|
| HEAD | Your Special (3 uses a round; one returns every 16 s) and the head's armour |
| CORE | HP, defence, weight, guard |
| R-ARM | The Light string and air Light |
| L-ARM | The Heavy KNOCK, the Launcher, the air Heavy spike, and your guard strength |
| LEGS | Speed, jumps, dash attack and a perk (wall jumps, triple jump, anchor, sea legs…) |
| LEGEND CARD | The Legend Art (super, 100 Hype) and a passive |

Limbs have their own armour: break one and it **pops off the figure** — walk over it to **snap it back on**. A broken
arm falls back on weak stump attacks, no head means no Special, cracked legs slow you down. **Take theirs:** if you're
missing a head or an arm and theirs is lying on the floor, walk over it and it snaps onto you, moves and all (a Pirate
wearing a Knight's head has the Knight's Special). Stolen parts last the round. Match 3+ parts to your
Legend Card's line for a set bonus (all six: **MINT SET**).

## Capsules (the gacha)

Parts and Legend Cards come from the **Capsule Machine**, paid for with Tokens earned by fighting (wins, arcade
stages, a daily bonus) — never real money.

- Rarities: **STANDARD** 62%, **DELUXE** 28% (chrome, +4%), **LIMITED** 8.5% (gold edition, +8%), **CHASE** 1.5%
  (dark body with glowing trim, +12%).
- A 10-pull always has a LIMITED or better; the 70th pull without a CHASE is a CHASE.
- The **Spotlight** banner features a different line each week.
- Duplicates level a part up (+2% each, to +5), then refund tokens.

Accounts are local (this browser's storage), with salted password hashes. It is not a secure account system.

## Online

**ONLINE** in the hub (`js/online.js`): rooms of up to **six** over the internet. Two fight; everyone else **watches the
fight live** and waits for their turn.

- **QUICK MATCH:** one button: into the best open public room (one with someone waiting on their own first, then any
  open room, then one mid-fight with a seat, where you're next in line), ready to fight. If there's none, it opens a
  public room of yours, ready, for the next person who presses it.
- **REPLAYS** (the hub, or the ONLINE lobby): every online fight you play, or watch to the end, is saved: the last 30,
  plus up to 20 you keep (★). A replay is the fight's start plus both fighters' buttons, stored as runs, so a fight is a
  few kilobytes; the game plays it out again exactly. The player: pause (Space), back / forward 5 s (← →), restart,
  ½× to 4×, a progress bar you can click; Esc leaves. ⤓ exports a `.kbr` file to send a friend; IMPORT plays theirs.
  Fingerprints every 5 s tell you if a replay no longer plays the same (made with a different version of the game).
  Only online fights for now: offline fights don't run on fixed, seeded steps, so they can't be replayed yet.
- **The room list:** public and private rooms are listed; join one with a tap (a private room asks for its password).
  You can also join any room by its five-letter **code**, or keep yours off the list (code only). The list lives on two
  free public MQTT brokers (no account, no server of ours): each host keeps a short note about its room there (name,
  host, players, rules, whether it needs a password, never the password itself), and the broker drops it when the
  host's browser goes away. If the list can't be reached you can still host and join by code.
- **In a room:** pick **your fighter** any time you're not fighting: one of your custom fighters (the Workshop's
  Custom slots) or any of the ten base characters (their Standard set). Switching takes your READY off. Press
  **READY**, or **SIT OUT** to just watch. A queue decides who fights next; with **auto-start** the next fight begins
  5 s after both are ready. Turn off "watch fights automatically" to stay on the room screen; WATCH joins a fight
  that's on.
- **Chat:** type your own messages (up to 120 characters; plain text, so no links or formatting get through) or tap a
  quick-chat phrase. The host passes messages on and slows down floods (4 every 6 s). Each player can MUTE someone
  (just for themselves), hide typed messages, or turn on a swear filter (off by default). The host can switch the room
  to quick chat only, or MUTE someone's typed chat for the whole room, besides kick and block. Messages from the room
  pop up while you're watching a fight or on the results screen (not in the middle of your own fight).
- **The host** runs the room: its name; public or private (password); listed or code only; locked to new players; room
  size (2 to 6); the rules (arena, first to 1/2/3, round time 60/99/180 s, rarity bonus, any fighters or base
  characters only); rotation (winner stays, both rotate, or the host picks with ▲ NEXT); auto-start; kick and block.
  Closing the room ends it for everyone.
- **After a fight:** YOU WIN / YOU LOSE with your records and rewards, then READY (back to the room, ready for the next
  one), CHARACTER SELECT (back to the room to pick again) or LEAVE ROOM. Watchers go back to the room on their own.
- **How you connect:** browsers connect to each other directly (WebRTC). The free [PeerJS](https://peerjs.com) service
  only introduces them, so there's no game server. The host links to every member; every fight gets its own direct
  link between the two fighters (if one can't be made: the room's connection when you're fighting the host, else
  relayed through the host). Each fighter also
  sends its buttons to the host, who passes them on to the watchers: their games replay the fight from them, a few
  frames behind, and someone who comes in late catches up from the start in a second or two. Like any peer-to-peer
  game, the people in your room can see your IP address. Some school, work or mobile networks block this kind of
  connection.
- **Netcode: rollback** (the GGPO kind). Both games run the same fight, 60 frames a second, and only the buttons
  travel. Your presses play after a small input delay (1 or 2 frames; more only on a very long ping) on both screens.
  Your friend's presses take a moment to arrive, so the game doesn't wait: it guesses they're still doing what they
  did last and plays on, saving the fight on each guessed frame. When their real buttons arrive and the guess was
  wrong, it puts the fight back to that frame and replays the frames since with the right buttons, instantly and
  silently (no sound, effect or banner plays twice). It never guesses more than 8 frames ahead; past that it waits
  ("waiting for your friend"). The two games also keep in step (GGPO's time sync): whichever runs ahead holds back a
  frame now and then.
  - **No freezes from a lost packet:** the two fighters' link is **unordered** (PeerJS `reliable: false`: still resent
    if lost, but a late packet doesn't hold up the ones behind it). On an ordered link one lost packet stalls every
    message after it until it's resent, which can take half a second or more, and the fight froze. Every button
    message also carries all your buttons your friend hasn't confirmed yet, so the next one covers a lost one; while
    waiting it sends them again every 50 ms. A fight against the host gets its own link too (the room's connection,
    which stays ordered, is only the fallback). Tested on the fake network with 3% loss and half-second resends: the
    old link sat frozen a third of the time, the new one never.
  - **The save:** `online.js` walks the whole fight from the match object down (fighters, figure poses, buffered
    presses, projectiles, imps, dropped parts, timers, the Legend Art on screen) and saves every object it reaches by
    value, then puts those values back into the same objects. Looks stay out (trails, wall cracks, the camera,
    particles). Saving takes about 0.2 ms; replaying 8 frames takes a few ms.
  - **Determinism:** fixed steps; a seeded random source for gameplay (`U.rand`); looks use `U.vrand` and must never
    decide whether gameplay randomness is drawn; timers and the Bard's beat on the fight's clock; nothing in the fight
    reads the camera (it differs per screen). Events (for rewards) and the end of a match only count once their frame
    is settled. Every half second the two fighters compare a fingerprint of a settled frame; if they ever differ, the
    first fighter's fight is copied over at an agreed frame (a safety net; watchers take the same copy).
  - **Tests** (`tools/harness.js`): `__rbRun(seed, frames, l1, l2, every, depth)` rewinds and replays a fight
    constantly and checks the whole save comes out identical; `__roomSetup(n, lag, jitter, picks)` + `__roomRun(ticks)`
    run a whole room of `n` games on one page over a fake PeerJS network (lag, jitter, `net.failDirect` to force the
    relay), and with `Online._t.debug = 1` every fighter and watcher records fingerprints to compare.

  An online fight can't be paused (Esc opens a menu: leave the fight, or stop watching). Everyone in a room needs the
  same version of the game: reload if it says otherwise.

## Tutorial

New collectors are offered it right after opening their first figure, and it's in the hub (**TUTORIAL**) and HOW TO
PLAY any time after (`js/tutorial.js`). It's a real fight in the Toy Shelf against a Knight dummy where nothing happens
until you do it: a card over the fight gives one lesson at a time, in your own keys (or your controller's buttons, or
the touch buttons), and the next opens once you've done it (or SKIP). Fourteen lessons: move, jump, your string, the
Launcher into an air combo, the KNOCK//BACK and catching the rebound, guard, dodge, grab-pummel-throw, your Special,
an OTG, a Part Toss, a Spring Burst, your Legend Art, and a last round where the dummy fights back. The dummy only
swings when a lesson wants it to and nobody can lose. Finishing it the first time is worth **900 Tokens**.

## Combo Trials

**COMBO TRIALS** in the hub (`js/trials.js`): every fighter's combos on its own **base** move list (a figure of that
line, never a mixed string), seven trials each, seventy in all: the string, the pause combo, the Launcher into an air
combo, the KNOCK//BACK with the rebound catch, a Special cancel, the line's signature trick (the Samurai's Rising Cut
into Tsubame Gaeshi, the Pirate's sand and Quick Shot, the Monk's mashed Flurry, the Viking's full wind-up, the Ninja's
Shadow Dash, the Summoner's Sic 'Em, the Paladin's crumple, the Dragoon's Vault, the Bard on the beat), and a Legend Art
finish. A panel lists the steps in your own keys; each ticks off as it lands, and the trial resets (with why) if the
combo drops or a wrong move comes out. **DEMO** plays it for you, and the same bot proves every one of the seventy
can be done. Clears are saved per collector and count toward REWARDS (*Combo scholar*, *Mastered*, *Professor*).

## Training lab

Plain Training (`js/lab.js`) has a fighting game's practice tools, each shown or hidden in the TRAINING panel (on by
default on a computer, off on a phone):

- **Inputs:** your button history on the left, one row each time what you hold changes: how many frames you held it,
  the stick as an arrow (as it sits on screen) and the buttons (L, H, G, SP, SN, SU, T, J, D).
- **Frame data:** a frame meter, one cell a frame for both of you: STARTUP (green), ACTIVE (red), RECOVERY (blue), hit
  or block stun (yellow), dodging (purple). A hit's hitstop isn't counted, as on a fighting game's own meter. Under it,
  your last move's startup (the frame it first hits on), active and recovery frames, and the **frame advantage** once
  you can both act again: *ON BLOCK −2* means the dummy can act two frames before you. When the dummy hits you it
  reads *YOU BLOCKED · YOU +6* (a move of 6 frames or faster punishes it).
- **Record and play:** **Y** (or RECORD) hands you the dummy while your own figure stands still; the recording starts
  on your first input and runs up to 10 s (Y again stops it, and it's kept for next time). **U** (or PLAY) has the
  dummy do it once; **Dummy: Playback (loop)** has it do it again and again, each time it can act. The stick is kept
  relative to the dummy's line to you, so "walk at them and swing" still comes at you from anywhere in the arena, and R
  starts a playback over. On a pad, RECORD and PLAY are in the pause menu.

## Rewards

**REWARDS** in the hub (`js/rewards.js`, after the design of Post Parade's quests): everything you do is counted three
ways at once (ever, today, this week), and five boards read those counts. The hub button shows how many are waiting.

| Board | What's on it |
|---|---|
| **Daily** | Eleven small jobs from a normal day's play (fights, wins, wall bounces, a 12-hit combo, a Legend Art, throws, OTGs, parts broken, a capsule), one rotating **featured figure** (win wearing any of today's line's parts), and *Busy day* for claiming six of the others. New jobs at midnight. |
| **Weekly** | Twelve bigger goals (15 wins, 3 Champion wins, an Arcade clear, wins with 5 different Legend Cards, wall breaks, ring outs, a 25-hit combo, mixed-arm wins, stolen parts, 25 dailies claimed). New goals every Monday. |
| **Fighters** | A mastery track for each of the ten lines: win with its Legend Card (1, 5, 15, 40, 100 wins). Tier III pays one of that line's DELUXE parts, tier V a LIMITED one. |
| **Milestones** | First steps for a new collector, then nineteen tiered chains (I to V) in Fighting, The wall, Technique, Collection and Dedication; each tier pays more, and the top ones pay Capsule Tickets. |
| **Awards** | Seventeen one-off medals (win a round untouched, three bounces in one combo, a comeback under 10% HP, every Legend Card, a CHASE pull...) that pay the moment you earn them. |

Quests and tiers are **claimed** (one at a time or CLAIM ALL); awards pay at once. Rewards are Tokens, **Capsule
Tickets** (a free ×1 capsule: the CAPSULES screen shows a TICKET button when you have one) and, on the fighter tracks,
parts. After a fight, the results list the awards it unlocked and a button to the rewards waiting.

## Modes

Arcade (six figures from the ten lines, the last one a Chase boss) · Versus (CPU at four levels, two players on one keyboard / two pads, or
**CPU vs CPU** to watch, with your own builds, any line's figure or random ones; plus an optional fair mode that
ignores rarity bonuses; it remembers your setup) · Training (pick yourself from your figures or any base fighter, the dummy and the arena; dummy settings, full meters, a
combo readout, health back the moment a combo ends, a start by a wall or a SAVED POSITION; R resets and T saves, or tap /
hold a pad's Back button; and the **lab**: inputs, frame data, record and play) ·
Workshop (your custom slots: Custom A and B free, Custom C to F unlocked with tokens for 1,000 / 2,000 / 3,000 /
5,000; your starter figure stays its Standard set; the hub's ACTIVE FIGURE plate picks which one you fight with) ·
Shelf (collection and records).

**Colours:** every figure comes in seven palettes, chosen on the Versus (P1 and P2), Training and Online fighter
select screens (your choice is remembered, and Arcade uses it too): CLASSIC (its own), CRIMSON, AZURE, JADE, ROYAL,
SHADOW and IVORY. A theme repaints any figure's armour and cloth, a mixed custom included. **Two figures that would
look alike** (the same colours on the same fighter, colours close enough to be confused, or the same theme on anyone)
never do: the second one is **tinted**, darker and a shade cooler (lighter for SHADOW).

**Figures are never quite still:** standing, they breathe, shift their weight and glance about, and every few seconds
fidget in their own way (a samurai resettles its grip, a pirate flourishes the cutlass, a ninja bounces on its toes, a
bard strums, a shield arm comes up).

**Small comforts:** a fight pauses itself if you switch tab or window; Esc goes back (or closes a pop-up) on every
menu screen; the pause menu has the volume; a **LEGEND ART READY** prompt (with your key) appears under a full Hype bar;
the mouse cursor hides in a fight; Enter or Space takes the main button on the results; and OPTIONS has a **screen
shake** setting (Full, Reduced, Off).

## Files

| File | What's in it |
|---|---|
| `js/parts.js` | Lines, slots, rarities, every move's frame data, part stats, `KB.stats(build)` |
| `js/models.js` | The voxel art for every part, the shared peg skeleton, icons, Legend Card art |
| `js/anim.js` | Stances and per-move poses |
| `js/fighter.js` | The fighter state machine, Legend Art catches, and `Combat` (hits, guard, wall bounce/tech/break, part breaks) |
| `js/arts.js` | Each Legend Art's cinematic: its choreography, camera shots, props, lighting |
| `js/match.js` | Rounds, camera, projectiles, the Summoner's imps, dropped parts, ring outs, training |
| `js/arena.js` | The three arenas and wall stress/cracks/breaks |
| `js/lab.js` | Training's lab: the input history, the frame meter and frame advantage, the dummy recording |
| `js/ai.js` | The CPU (plays through the same inputs as a human; picks a combo route and plays it out, takes OTGs and rebounds, steers along walls) |
| `js/gacha.js` | Capsule rates, pity, the 3D machine and reveal |
| `js/auth.js` | Local accounts and the save (tokens, collection, builds, records) |
| `js/input.js` | Keyboard, controllers (type detection, prompts, rebinding, hat d-pads), the input buffer, pad menu navigation |
| `js/menu.js`, `js/hud.js` | Every screen, and the in-fight HUD |
| `js/online.js` | ONLINE: the room list (MQTT), rooms of six over PeerJS (host controls, queue, fighter select, chat), fights between any two members, spectating, rollback netcode (the fight's save/restore, time sync), fingerprints and resync |
| `js/trials.js` | COMBO TRIALS: the seventy trials, the step checker, the DEMO bot, and the screens |
| `js/rewards.js` | REWARDS: the counters, the five boards, claiming, and the screen |
| `js/tutorial.js` | The TUTORIAL: lesson cards over a live fight, listening to the match's events |
| `tools/harness.js` | Test helpers: step the game at a fixed rate, script inputs, log callouts |
