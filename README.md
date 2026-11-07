# KNOCK//BACK

A voxel arena fighter where the fighters are **action figures**, in series of their own: **HISTORICAL FANTASY**
(Monk, Viking, Summoner, Bard), **EDO JAPAN** (Samurai, Shinobi, Ronin, Kunoichi, Shogun, Daimyo), **KNIGHTS OF THE
REALM** (Knight, Paladin, Dragoon, Templar, Crusader, Lancer), **LOVERS OF THE SEA** (Pirate, Captain, Cannoneer,
Blackbeard, Redbeard, Sailor, Marauder, Musketeer, Ghost Pirate) and **MODERN SPORTS** (eleven athletes) — 36 lines,
and every figure is six snap-on parts you can mix freely.

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

**Target tracking (OPTIONS › GAMEPLAY, off by default):** on, every attack (strings, Heavies, air attacks, Specials,
throws, dash attacks) first turns you to face your opponent, whichever way you were facing or holding the stick, so it
always aims at them. Off, attacks go the way you face or hold the stick and only snap onto someone close in front of
you. It applies to every person playing on this device (never to a CPU, nor to a combo trial's demo). Online, each
player's own setting travels in the fight's setup (and its replay), so the two screens always agree.

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

**Command Specials:** a motion on the stick, then Head Special, read on the screen like a 2D fighter's: **↓ is the
stick pulled down and → is the side of the screen (left or right) your opponent is on**, flipping when you swap
sides, so the gesture is the same anywhere on the stage: **↓↘→** (quarter-circle forward), **↓↙←** (quarter-circle
back) and **→↓↘** (dragon punch). The Special then turns to face them wherever they are. Special on its own is still the head's own Special. See
[Command Specials](#command-specials) for every figure's three.

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
  carries on (the first one hangs them there a moment, so you can get to them). Quick Rise (Dodge as you land) gets out
  of it.
- **Down Dash** — in the air, hold Guard and press Dodge: a dive straight to the floor, steered with the stick. It uses
  your air dodge and has no invincibility (it's for getting down fast); you can act the moment you land.
- **Part Toss** (its own button: F, or click the right stick) — pull a part off your own figure and throw it: the head first, then the L-arm, then
  the R-arm. It works as a cancel off any hit. A toss that lands **extends the combo** ("EXTEND 1/2"): its clock and
  decay start over, and you get a fresh OTG and ground bounce; it pops them up a little and **hangs them there a
  moment**, time to follow the throw. Twice a combo at most: combo, toss, combo, toss, final combo. The part lands on
  the floor; go and snap it back on (before they take it, see Parts).

## Legend Arts (supers)

100 Hype. The screen freezes for the flash, then the Art tries to **catch** — each in its own way — and if it does,
it plays a **full cinematic**: black bars, its own camera shots, and the last blow lands with a freeze, a flash and
its name. The clock and the CPUs wait while it plays. Its camera never looks through a wall: near one, a shot moves in
just inside it (or swings round to the side with room), and the flash's close-up picks the side of the figure that's
open.

**The last blow depends on whether a combo was already running.** A **raw** Art (it caught them with no combo going)
**bounces** them the way that blow goes, and your combo carries on: the Arts whose last blow knocks them back
(Samurai, Knight, Monk, Ninja) send them flying off the **wall** (a KNOCK//BACK: they're carried all the way there,
gravity lightened, fast enough to bounce), and the ones that slam them down (Pirate, Viking, Summoner, Paladin, Dragoon,
Bard) **ground bounce** them. An Art that **ends a combo** (it caught them after hits, a bounce or an OTG) puts them down
with a **HARD KNOCKDOWN** instead: on the floor longer (1.15 s), no quick rise, and an **OTG** can always pick them up
again (one is kept free for it). The Summoner's imps leave a figure alone while it flies into a bounce. A raw Art's
ground bounce comes up about chest high, with no air recovery, and your recovery after a raw Art is half as long, so the
bounce is there to catch.

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
| Pirate (Cutlass) | Cut › Backcut › Flourish (spin) › Boot to the Face | Sand in the Eyes (dizzy) | Cut › Backcut › Cannonball (dive) | **Dirty Fighting**; with the Flintlock, one Light then Heavy is a **Quick Shot** gun cancel (two Lights then Heavy is the launcher). The Flintlock holds **four rounds** (Point Blank, Quick Shot and the Plunging Shot spend one each); empty, it reloads for 5 s and Heavy clubs them with the butt |
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
harder. **She can pick them up:** run into one of your own imps on the floor and she lifts it (two at most: one rides
on her head, one on her shoulder). Carried imps **don't run out** and can't be swatted; the **Part Toss** button then
throws an imp instead of one of her parts, homing in like a tossed part, one at a time. Mid-combo each thrown imp is an
**extension** (twice a combo, like a Part Toss), and a thrown imp lands and fights on (it can't be caught again for a
second). If she's hit, the imps she carries hop off. The CPU throws them too.

**Projectiles** fly as real things you can see: the Pirate's pistol ball (with a muzzle flash and a kick up the arm),
the Ninja's kunai (they stick in walls), the Summoner's spirit bolts and her Hex glyph, the Bard's sound waves with
notes riding on them, and the Ninja's **Chain Hook** (the weighted chain flies out, whips round them, and the Ninja
yanks them in along the floor; twice in any 5 s, and a third try says how long to wait). Projectiles stop short of
the walls (the chain's weight, the hex glyph and the Bard's sonic boom burst or clank before them). Every one is aimed: it leads a moving target, finds them high, low or on the floor,
and the Part Toss homes in. The Ninja's **Shadow Step** works twice a round, 3 seconds apart.

## MODERN SPORTS (the second series)

The second series was **MODERN SPORTS** (there are four series now: see below) (`js/sports.js` the
lines, parts and moves; `js/sports_look.js` their voxel parts, stances and poses; `js/sports_arts.js` their Legend
Arts; `js/sports_story.js` their Arcade stories). Every list of fighters in the menus (the starter pick, Selection
Tickets, your figures, Versus, Training, Online, the Shelf, Combo Trials, Stories, the Rewards fighter tracks) shows
one series at a time under a tab for each (Versus has a SERIES row); the series you last looked at carries over. The
Capsule machine has a banner for each series. Parts mix freely across series: a Samurai with a Boxer's glove and a
Skateboarder's legs is a real figure with its own mixed string (1,260 pairings now, all generated).

| Line (R-ARM) | Light string | Pause branch | Air string | Signature | Heavy (L-ARM) | Special (HEAD) | Legend Art |
|---|---|---|---|---|---|---|---|
| Wrestler (Taped Fists) | Chop › Forearm Smash › Knee Lift › Lariat | Eye Rake (dizzy) | Flying Forearm › Elbow Drop | **Suplex City**: a longer grab, and throws become a Suplex, German Suplex, Gutwrench and Powerbomb (+25%) | Spear (armoured tackle) | **Body Slam**: a command grab, unblockable, chains out of a string | Main Event: airplane spin into a powerbomb |
| Baseball (Slugger Bat) | Check Swing › Line Drive › Bat Jab (long stagger) › Home Run Swing | Bunt (pops them up) | Air Swing › Chopper dive | **Clutch Hitter**: hold Light to wind up the Home Run Swing | Fastball (a pitch, 9 m) | Curveball (dizzy, 10 m) | Grand Slam: batting practice, then the home run |
| Football (Stiff-Arm) | Stiff Arm › Forearm Shiver › Swim Move (round behind) › Pancake Block (ground bounce) | Facemask! (crumple) | Leaping Shove › Dogpile | **Pass Block**: armour in the startup of every Light after the first | Bullet Pass (9.5 m) | Blitz (armoured charge) | Touchdown Drive: the length of the field and a spike |
| Soccer (Captain's Armband) | Toe Poke › Instep Drive › Scissor Kick › Bicycle Kick (launches) | Slide Tackle | Volley › Flying Scissor › Overhead Kick | **Footwork**: every kick carries you with them | Power Shot (a ball, 8.5 m) | Free Kick (crumples, 10 m) | Golden Goal: keep-ups, volleys, the bicycle kick |
| Boxer (Right Glove) | Jab › Cross › Body Blows (mash) › Uppercut | Haymaker (crumple) | Jab › Cross › Overhand spike | **Counterpuncher**: counter hits +50% (not +20%) | Power Hook | **Bob & Weave**: slip the next attack | Final Round: a flurry, the bell, the uppercut |
| Fencer (Épée) | Thrust › Disengage › Flurry of Points › Coupé | Flèche (dash through) | Thrust › Plunging Point | **Riposte**: Light after a Just Guard | Balestra Lunge | **Parry**: turn the next hit aside and riposte | Touché: five touches, one lunge |
| Weightlifter (Dumbbell) | Dumbbell Swing › Curl Smash › Overhead Press (ground-bounces everyone around) | Plate Toss | Swing › Dumbbell Drop | **Max Effort**: hold Light to wind up any swing; armour in every startup | Kettlebell Swing (armoured) | Chalk Up (armour, +15% damage) | World Record: three reps with them on the bar |
| Bowler (Bowling Ball) | Ball Swing › Backswing › Spinner › Strike! | Gutter Ball (rolls along the floor) | Swing › Ball Drop | **Strike!**: his one ball stops on the floor and trips anyone who runs into it; without it he fights bare-handed | Rolling Thunder (a ball along the floor, OTG) | Hook Shot (out wide, hooking back in) | Perfect Game: they're the pins |
| Archer (Recurve Bow) | Bow Strike › Limb Swipe › Snap Shot (arrow) › Bow Uppercut | Volley (three arrows) | Strike › Swipe › Arrow Rain | **Quick Draw**: arrows in the string | Power Draw (10.5 m) | Pinning Shot (crumples, 12 m) | Bullseye: a sky of arrows and one through the middle |
| Skateboarder (Skateboard) | Deck Swing › Tail Whip › Kickflip (launches) | Grind (through them) | Air Kick › Shove-It › Board Drop | **Style Points**: air hits build 50% more Hype | Ollie Slam | Grind Rush (invulnerable) | The 900: two and a half spins and a slam |
| Basketball (Shooting Sleeve) | Hand Check › Elbow Clear › Spin Move (round behind) › Block Party (launches) | Ankle Breaker (crumple) | Tip-In › Alley Slap › Putback Slam | **Hang Time**: air Lights carry you up, a three-hit air string | Chest Pass (a basketball, 9 m) | Euro Step (invulnerable, pops them up) | Posterized: a crossover, the alley-oop, the dunk |

Their legs and cards: the Wrestler and Weightlifter are planted (anchor), the Footballer's dash attacks carry armour,
the Soccer player is the fastest runner and the Boxer has a dancer's dodges, the Fencer and Bowler slide further,
the Archer jumps highest, and the Skateboarder wall-jumps. Passives: Crowd Pleaser (throws +25%), Slugger (Heavies
+15%), Juggernaut (dash attacks and Specials +20%), Hat Trick (+12% from a combo's 3rd hit), Killer Instinct (+15%
under half HP, and a sway out of one raw Legend Art in five), Precision (a combo's first hit +25%), Gains (each landed Heavy +4% for the round, to +20%), Hook Spin
(thrown and rolled shots +18%), Eagle Eye (+18% from 5 m), Radical (+12% in the air). Their balls and arrows fly as real
things: a baseball, a football, a soccer ball, arrows (a three-arrow volley too), a weight plate, and bowling balls
that roll along the floor and trip whoever they reach. In the Arcade they came out of their boxes this week, and each
is missing something from it (a tag-team partner, a lucky ball, a playbook, a golden boot, a corner man, a medal, a
weight plate, a tenth pin, a golden arrow, a wheel); their rivals are each other: Wrestler and Boxer, Baseball and
Archer, Football and Soccer, Fencer and Weightlifter, Bowler and Skateboarder.

**Real balls.** The Baseball, Football, Soccer, Bowling and Basketball players each throw ONE ball, and it stays a
ball: it flies like a shot to its range, then drops, bounces off the floor and walls, rolls and stops, and waits on the
floor until its owner walks over it. No ball, no throw: Heavy becomes a Tackle (a Body Drop in the air) and a Special
that needs it says NO BALL. Each has its own way: one **pitch** in four that lands leaves them **DIZZY** for a couple of
seconds (now, or the moment they're back on their feet); while the **football** is down, Heavy is a **Full-Force
Tackle** (armoured, the biggest knockback he has); the **soccer ball** ricochets off the walls and stays live while it's
fast, and every wall it comes off adds **15%** to its hit until it's trapped; the **bowling ball** is the one the Bowler
swings, so with it out he fights bare-handed, and anyone who **runs into it** on the floor **trips** and goes down; the
**basketball** comes off the walls so lively you can catch the rebound. A Legend Art or a new round brings the ball
back. The CPU fetches its ball and hops over a Bowler's. The **Boxer's** Killer Instinct also sways out of one Legend
Art in five thrown at him **raw** (not part of a combo).

Their **Combo Trials** match the first series: ten Basic, seven Advanced and five Professional each (220 more, 440
in all), every one proven by the DEMO bot at 60 Hz, 144 Hz and on uneven frames: the Wrestler's Body Slam chains,
the Baseball player's Clutch Home Run into the wall, the Football player's Blitz, the Boxer's Bob & Weave openers, the
Weightlifter's Chalk Up and Max Effort, the Bowler's Split Shot, the Skateboarder's Grind Rush, and every Legend Art.

## EDO JAPAN and KNIGHTS OF THE REALM

The Samurai and the **Shinobi** (who was the Ninja) moved to **EDO JAPAN**, and the Knight, Paladin and Dragoon to
**KNIGHTS OF THE REALM**; each series gained new figures (`js/edo.js` / `js/realm.js` the lines and moves,
`*_look.js` their voxel parts and stances, `*_arts.js` their Legend Arts, `*_story.js` their Arcade stories; the
line ids never changed, so every saved figure and part still works). Every fighter list has a tab per series; on the
**Versus** screen each figure picks its own series (CPU 1 and CPU 2, or you and your opponent), and Training's dummy
has its own tabs.

| Line (R-ARM) | Light string | Pause branch | Air string | Signature | Heavy (L-ARM) | Special (HEAD) | Legend Art |
|---|---|---|---|---|---|---|---|
| Ronin (Worn Katana) | Nukitsuke › Kesa-giri › Gyaku-giri › Chiburi (launches) | Kasa Toss (his straw hat flies) | Air Draw › Falling Cut | **Battōjutsu**: a string's first cut comes out of the scabbard, +30% | Saya-ate (the scabbard, a KNOCK) | Sake Swig (heal 5%, +15% for 5 s) | Last Draw: one cut, his back turned, the scabbard clicks |
| Kunoichi (Tessen) | Fan Strike › Fan Sweep › Petal Flurry › Gale Fan (launches) | Needle Kiss (a poisoned hairpin) | Air Fan › Fan Spin › Iris Drop | **Lingering Venom**: Lights +20% on the POISONED | Kanzashi Volley (three poisoned pins, 9 m) | **Kawarimi**: the next hit lands on a log; she's behind them | Thousand Petals: a petal storm and hairpins from every side |
| Shogun (Tachi) | Tachi Cut › Return Cut › Shogun's Verdict (a KNOCK; armoured startups) | Gunbai Rebuke (crumple) | Air Tachi › Helm-Splitter | **Warlord**: walls take 40% more stress from anyone he sends into them | Gunbai Bash (armoured) | Teppō Volley: the musket line behind him fires (11 m) | Three Ranks: rank after rank of muskets, and the tachi |
| Daimyo (Naginata) | Sweep › Return Sweep › Wheel (all round) › Rising Crescent | Sune-gari (reaps the shins) | Air Sweep › Crescent Drop | **Long Reach**: Lights from 1.6 m or further +15% | Long Thrust (2 m) | **Tribute**: a sweep that levies 25 of their Hype | Hundred Banners: a ring of banners and the wheeling blade |
| Templar (Greatsword) | Oberhau › Zwerchhau › Half-Sword Thrust › Zornhau (a KNOCK) | Mordhau (the hilt, crumple) | Air Cleave › Cross Drop | **Half-Sword**: Lights from under 1.1 m +20% | Wrath of the Temple | Vow (20% less damage, double Hype from hits) | Beauséant: the banner, three cuts and the Murder-Stroke |
| Crusader (Morning Star) | Flail Swing › Backhand › Whirling Chain › Morning Star (ground bounce) | Shield Hook (pops them up) | Air Flail › Falling Star | **Over the Shield**: his Lights can't be Just Guarded, and cost double guard | Heater Charge (armoured) | Deus Vult! (a war cry all round, +12% for 5 s) | Siege of Faith: the flail wheels and comes down like a star |
| Lancer (Tilting Lance), on horseback | Lance Jab › Lance Sweep › Hoof Strike › Unhorse (launches) | Trample (the horse runs them down) | Lance Up › Lance Fall | **Mounted**: dash attacks and Specials +15% | Couched Lance (a 5.5 m charge) | The Tilt (an 8 m armoured charge) | The Joust: two passes down the lists and the third unhorses them |

Passives: Nothing to Lose (Ronin, +18% while behind on HP), Unseen (Kunoichi, +20% from behind), Iron Rule (Shogun,
Lights hit him 15% softer), My Domain (Daimyo, +12% in the middle of the floor), Penance (Templar, every hit he takes
adds 2% to his next, to +30%), First Blood (Crusader, the round's first hit +40%), Charger (Lancer, running before a hit
adds up to +20%), Above the Rim (Basketball, +15% on anyone in the air). **POISON** works like burning (a tick every
half second), in green. The Lancer's legs are **Bramble the warhorse**: wear them on any figure and it rides (the
horse stays level whatever the rider does). In the Arcade each came out of the box missing something (a lord, a
mission scroll, the shogun's seal, a castle, a sealed reliquary, a pilgrim's shell, a jousting favour, a hoop); the
rivals are Ronin and Shogun, Kunoichi and Daimyo, Templar and Crusader, and the Lancer rides at the Knight. Their
Advanced and Professional trials come from one set of route patterns over each kit (`genRoutes` in `js/trials.js`),
with fixes where a kit needs them, and like every trial they're proven at 60 Hz, 144 Hz and on uneven frames.

## LOVERS OF THE SEA

The **Pirate** moved here from HISTORICAL FANTASY, and eight more joined him (`js/sea.js`, `js/sea_look.js`,
`js/sea_arts.js`, `js/sea_story.js`), each armed the way they really were:

| Line (R-ARM) | Light string | Pause branch | Air string | Signature | Heavy (L-ARM) | Special (HEAD) | Legend Art |
|---|---|---|---|---|---|---|---|
| Captain (Naval Sabre) | Sabre Cut › Backcut › Thrust › Captain's Slash (a KNOCK) | Spyglass Bonk (dizzy) | Air Cut › Boarding Drop | **All Hands**: her Lights hit the SPOTTED 10% harder again | Spyglass Smash (the brass spyglass) | **Spotted!**: for 5 s everything hits them 15% harder | Walk the Plank: along the board at sword-point, and a splash |
| Cannoneer (Linstock) | Match Jab › Pole Swing › Linstock Spin › Touch-Hole (launches, BURNING) | Powder Flash (dizzy) | Air Jab › Ramrod Drop | **Slow Match**: his Lights +20% on anyone burning | Grapeshot (a swivel gun, wide, 6 m) | Chain Shot (two balls chained, 10 m) | Full Battery: a row of cannons and every one fires |
| Blackbeard (Cutlass) | Cutlass Hack › Backhand › Beard Butt (smoulders) › The Boot (a KNOCK) | Close Shot (a pistol point blank, crumple) | Air Hack › Cutlass Drop | **Dread**: the fuses leave them smouldering | Six Pistols (one a press; six, back over 12 s) | Smoke & Fuses (dizzy, all around) | Queen Anne's Revenge: six pistols and the cutlass |
| Redbeard (Kilij) | Kilij Cut › Draw Cut › Crescent (all round) › Corsair's Rise | Kalkan Rim (crumple) | Air Cut › Falling Crescent | **Admiral**: +15% on anyone with their back to a wall | Kalkan Charge (armoured) | Naphtha Pot (a fire pot, BURNING) | Corsair Fleet: cuts like a galley's oars, and the crescent |
| Sailor (Belaying Pin) | Pin Swing › Pin Backhand › Knee to the Gut › Sailor's Uppercut | Spit in the Eye (dizzy) | Air Pin › Deck Drop | **Bar Brawler**: a landed Heavy gives him a second of armour | Haymaker (a bare fist) | Hornpipe (+12% damage, 10% faster) | Sea Shanty: a punch on every beat and the anchor comes down |
| Marauder (Boarding Axe) | Axe Hack › Backhand › Bearded Hook (pulls in) › Cleave (a KNOCK) | Hatchet Throw | Air Hack › Axe Drop | **Keep What You Break**: each part he breaks heals him 8% | Grappling Hook (hauls them in) | Boarding Rush (armoured) | Boarding Party: the hook, the haul, the axe, overboard |
| Musketeer (Musket & Bayonet) | Bayonet Thrust › Butt Stroke › Bayonet Twist › Musket Lift | Bayonet Charge (through them) | Air Thrust › Plunging Bayonet | **Drilled**: reloads in 1.8 s, not 3 | Musket Shot (12 m; then reload) | Aimed Shot (crumples at 14 m) | Fix Bayonets!: the charge, the thrusts, one shot point blank |
| Ghost Pirate (Spectral Cutlass) | Spectral Cut › Phantom Backcut › Through the Body (every time) › Drowning Rise | Wail (dizzy) | Air Cut › Undertow | **Haunting**: Through the Body passes through them every time | Ghostfire (a green flame, GHOSTFIRE ticks) | Phase (everything passes through him for a second) | Davy Jones' Locker: black water, cold hands, and up again |

Passives: Quarterdeck (Captain, +12% while ahead on HP), Powder Keg (Cannoneer, his burns last twice as long), Terror
(Blackbeard, anyone within 3 m deals 10% less), Barbarossa (Redbeard, +10% damage and Hype 15% faster), Scrapper
(Sailor, +15% for 3 s after he's hit), Reaver (Marauder, breaks parts 30% faster), Steady Aim (Musketeer, shots +18%),
Undying (Ghost, once a round a blow that would KO him leaves him at 1 HP). In the Arcade each lost something to
PROTO-0 (a ship in a bottle, the gold salute ball, the black flag, the admiral's ring, a compass, a treasure map, a
ramrod, a brass nameplate with a name on it); the rivals are Blackbeard and Redbeard, the Captain and the Ghost, the
Sailor and the Marauder, the Musketeer and the Cannoneer. HISTORICAL FANTASY keeps the Monk, the Viking, the Summoner
and the Bard for now. Their trials come from the same route generator, proven at 60 Hz, 144 Hz and on uneven frames.

## Ammo

Guns and bows run dry. Every shot spends one; the last one starts the reload, and until it's done the weapon's
Heavy is a blow with the weapon itself (a string keeps going with the bow or the butt instead of the shot). The HUD
shows what's left under SPECIAL. Thrown sports balls don't use ammo: those have to be picked back up.

| Weapon | Ammo | Reload | Without it |
|---|---|---|---|
| Pirate's Flintlock | 4 rounds (Point Blank, Quick Shot, Plunging Shot) | 5 s | Pistol Butt, Pistol Club |
| Blackbeard's Brace of Pistols | 6 pistols (Six Pistols, Pistol Rain, Close Shot) | 6 s | Pistol Butt, Pistol Club |
| Musketeer's musket | 1 cartridge (Musket Shot) | 3 s (1.8 s Drilled) | Musket Butt |
| Cannoneer's Swivel Gun | 3 shot (Grapeshot, Mortar Drop) | 5 s | Barrel Bash |
| Archer's bow | 10 arrows (Snap Shot, Volley, Arrow Rain, Power Draw, Plunging Arrow) | 5 s | Bow Jab, Bow Swat, Bracer Bash |

## Armoured charge, auto combos and Tech Chase

- **Holding Heavy** to charge it gives **one hit of armour**, for every figure. The first hit taken while charging
  is shrugged off and the charge carries on; a second one gets through.
- **Heavy auto combos:** a tap of Heavy is the KNOCK, as ever. Press Heavy again before it lands and it becomes a
  three-hit auto combo instead: the opener only staggers, the chain runs itself on a hit, and it ends in a
  stronger KNOCK. Ten brawlers have one (`js/heavies.js`):

  | Figure | Chain |
  |---|---|
  | Monk | Thunder Palm › Twin Dragons › Thunderclap |
  | Viking | Shield Ram › Axe Chop › Skull Splitter |
  | Knight | Shield Bash › Pommel Strike › Overhand Cut |
  | Boxer | Power Hook › One-Two › Liver Shot |
  | Wrestler | Spear › Knife-Edge Chop › Clothesline |
  | Weightlifter | Kettle Swing › Kettlebell Return › Overhead Slam |
  | Shogun | Gunbai Bash › Tachi Cut › Gunbai Sweep |
  | Crusader | Heater Charge › Flail Swing › Shield Crush |
  | Redbeard | Kalkan Charge › Kilij Draw › Kalkan Smash |
  | Sailor | Haymaker › Bar-Room Jab › Knockout Swing |

- **Tech Chase:** when your KNOCK sends them flying, hold the stick toward them and press **Snap**. For half a bar
  of Hype your recovery is cancelled and your dash runs them down, stopping a step short so you can keep the combo
  going (catch the wall rebound, meet them as they land). Snap without the stick toward them is the plain Snap
  Cancel. The CPU tech chases too.

## Command Specials

Every figure has three more Specials on fighting-game motions with Head Special, and each one is something only that
figure would do: a Daimyo bribes, a Summoner throws her own imps, a Captain's ship lurches, a Pirate's parrot pecks,
a Ronin gets more dangerous the closer he is to losing. The motions are just the buttons: what each does is the
figure's own, and a rising anti-air is there only where it's the figure's signature (the boxer's uppercut, the
bicycle kick, the alley-oop, a horse rearing, a cannon fired at the deck to fly).

Motions are read on the screen like a 2D fighter's: **↓ is down and → is the side of the screen they're on**
(it flips when you swap sides), and the Special then turns to face them. They belong to the HEAD (wear someone's
head, use their Specials) and share its uses with the plain Special: every head has one more use a round for them.
The move list (pause) shows all four.

| Figure | ↓↘→ | ↓↙← | →↓↘ |
|---|---|---|---|
| Monk | **Dim Mak**: a pressure point, SEALED (no Special) 6 s | **Iron Shirt**: three hits don't stagger him | **Ki Burst**: destroys every enemy shot within 4.5 m |
| Viking | **Hurled Axe**: shatters a guard it hits | **Shield Wall**: shots bounce back | **Berserkergang**: 10% HP for +25% damage and armour on every attack |
| Summoner | **Imp Bomb**: one of her imps, thrown, bursts | **Soul Swap**: trades places with an imp | **Blood Pact**: her imps burst to heal her and give Hype |
| Bard | **Lullaby**: ASLEEP | **Allegro**: 30% faster 6 s | **Encore**: his last Special again |
| Samurai | **Kiai**: a shout, FROZEN in place (even in the air) | **Mikiri**: reads the blow, a crumpling draw | **Nōtō**: blade sheathed, the next hit +60% and crumples |
| Shinobi | **Shuriken**: three stars | **Makibishi**: caltrops, SLOWED | **Smoke Bomb**: vanishes for 3 s |
| Ronin | **Drunken Stagger**: an untouchable stumbling cut | **Sake Spit**: in their eyes, DIZZY | **Last Stand**: harder the lower his HP (up to ×2.6) |
| Kunoichi | **Poison Mist**: POISONED | **Charm**: a blown kiss, their stick works backwards | **Senbon Pin**: PINNED, can't move or jump |
| Shogun | **Siege Ram**: the next wall they hit breaks | **Shogun's Decree**: WEAKENED and SLOWED all round | **Kabuto Stance**: nothing staggers him for 5 s |
| Daimyo | **Returning Tessen**: the fan comes back, hits both ways | **Castle Gate**: a wall no shot or figure passes | **Bribe**: their next hit does nothing |
| Knight | **Shield Charge**: armoured, breaks guards | **Mordhau**: the crossguard as a hammer, crumple | **Chivalry**: frontal blows guarded on their own |
| Paladin | **Judgment**: a pillar of light on the marked spot | **Lay on Hands**: heal 12% | **Divine Shield**: untouchable 1.5 s, can't attack |
| Dragoon | **Dragon Fang**: a 2.3 m fiery thrust | **High Jump**: lands on them from the sky | **Lance Vault**: over them, down behind, spikes |
| Templar | **Templar's Brand**: his hits on them heal him | **Consecrate**: holy ground, heals him and burns them | **Scourge**: his own HP for 40 Hype |
| Crusader | **Flail Wrap**: DISARMED, no Lights 3 s | **Holy Relic**: every status lifted, none takes | **Flail Storm**: a whirling walk, four hits |
| Lancer | **Trample**: the horse runs them down | **Wheel About**: hooves all round, armoured | **Rear Up**: the horse rears (anti-air) |
| Pirate | **Rope Swing**: boots first, over low attacks | **Spilled Rum**: a trap, slip and burn | **Polly!**: the parrot pecks them three times |
| Captain | **Ship's Guns**: a cannonball on the marked spot | **Hard to Port!**: the deck lurches, they're thrown (unguardable) | **Raise the Colours**: her hits heal her and give Hype |
| Cannoneer | **Hot Shot**: BURNING | **Powder Trail**: a trap that blows them sky-high | **Recoil Jump**: rides the gun's blast up |
| Blackbeard | **Grenado**: bursts 2 m wide | **Lit Fuses**: his blows burn, hitting him burns | **No Quarter**: double damage under 30% HP |
| Redbeard | **Kalkan Toss**: the shield bounces off two walls | **Greek Fire**: a burning pool | **Crescent Wave**: passes through them |
| Sailor | **Belaying Pin**: DIZZY | **Lasso Knot**: HOBBLED, no jump or dodge | **Anchor Drop**: hits them even lying down |
| Marauder | **Pillage**: a command grab that steals 25 Hype | **Hull Breaker**: armoured overhead | **Sunder**: their weakest part's armour, or the part |
| Musketeer | **Buck and Ball**: a spray | **Prone Shot**: flat on the floor, shots go over her | **Reload Drill**: loaded, and the next hit crumples |
| Ghost Pirate | **Chains of the Deep**: drags them in | **Haunt**: behind them, SLOWED | **Davy's Toll**: takes 12% of their HP |
| Wrestler | **Running Lariat**: armoured | **Powerbomb**: a command grab | **Hulk Up**: heals, full Burst, armour |
| Baseball | **Line Drive**: the furthest KNOCK there is | **Catch**: shots caught for Hype | **Stolen Base**: an untouchable slide past them |
| Football | **Stiff Arm**: breaks guards | **Hurdle**: over them, cleats first | **Victory Dance**: a long celebration, 35 Hype |
| Soccer | **Slide Tackle**: down hard | **Simulation**: the dive, a YELLOW CARD | **Bicycle Kick**: spikes them |
| Boxer | **Dempsey Roll**: five hooks | **Rope-a-Dope**: soaks hits for Hype | **Gazelle Punch**: the leaping uppercut |
| Fencer | **Flèche**: 6 m in a flash | **Touché**: three win the bout, DIZZY | **Passata Sotto**: ducks under, thrusts up |
| Weightlifter | **Plate Roll**: along the floor, jump it | **Barbell Spin**: armoured, all round | **Protein Shake**: more damage, less knockback |
| Bowler | **7-10 Split**: two pins a hair apart, DIZZY | **Pin Setter**: a rack of pins, down hard | **Spare**: his ball rolls back through them |
| Archer | **Rain of Arrows**: on the marked spot | **Disengage**: a backflip and an arrow | **Skyward Volley**: three arrows up |
| Skater | **Board Toss**: the board like a frisbee | **Handplant**: low, legs sweeping round | **McTwist**: the spinning 540 |
| Basketball | **Ankle Breaker**: the crossover, DIZZY | **Take the Charge**: their foul, they crumple | **Alley-Oop**: the leap |

What they leave on someone: SEALED (no Special), CHARMED (the stick backwards), PINNED (can't move), HOBBLED (no
jump or dodge), DISARMED (no Lights), FROZEN (stopped dead), BRIBED (the next hit does nothing), BRANDED, TOUCHÉ,
SLOWED, WEAKENED, SUNDERED. The Crusader's Holy Relic lifts all of them. Traps sit on the floor for 8 to 12 s (one
of each at a time); a strike from above marks the spot first, so you can step out of it; a counter answers a blow
with its riposte, but a command grab or a Legend Art gets through. The CPU uses them too.

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
  size (2 to 6); the rules (arena, stage hazards on or off, first to 1/2/3, round time 60/99/180 s, rarity bonus, any fighters or base
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
the touch buttons), and the next opens once you've done it (or SKIP). Up to nineteen lessons:
move, jump, your string, the Launcher into an air combo, the KNOCK//BACK and catching the rebound, a Tech Chase,
guard, dodge, the armoured charge, your Heavy's auto combo (if it has one), grab-pummel-throw, your Special, your
three Command Specials (it names each one and wants each motion once), your weapon's ammo and reload (if it has
any), an OTG, a Part Toss, a Spring Burst, your Legend Art, and a last round where the dummy fights back. A figure
without an auto combo or ammo skips those lessons, and the count shows only the lessons yours gets. The dummy only
swings when a lesson wants it to and nobody can lose. Finishing it the first time is worth **900 Tokens**.

## Combo Trials

**COMBO TRIALS** in the hub (`js/trials.js`): every fighter's combos on its own **base** move list (a figure of that
line, never a mixed string), ten trials each, two hundred in all (both series): the string, the pause combo, the Launcher into an air
combo, the KNOCK//BACK with the rebound catch, a Special cancel, the line's signature trick (the Samurai's Rising Cut
into Tsubame Gaeshi, the Pirate's sand and Quick Shot, the Monk's mashed Flurry, the Viking's full wind-up, the Ninja's
Shadow Dash, the Summoner's Sic 'Em, the Paladin's crumple, the Dragoon's Vault, the Bard on the beat; the Wrestler's eye
rake, the Baseball player's wind-up Home Run, the Pancake Block, the Bicycle Kick, the Boxer's Body Blows, the Flèche,
the Weightlifter's Max Effort, the Gutter Ball, the Volley, the Skateboarder's Kickflip), a Legend Art
finish, the air Heavy SPIKE into a ground bounce, an OTG off the floor, and a Part Toss extension. A panel lists the
steps in your own keys; each ticks off as it lands, and the trial resets (with why) if the combo drops or a wrong move
comes out. **DEMO** plays it for you, and the same bot proves every one can be done, at 60 and 144 frames a second and
on uneven frames. Clears are saved per collector and count toward REWARDS (*Combo scholar* counts every tier;
*Mastered* and *Professor* count a fighter's basic trials).

**ADVANCED** (the second tab): each fighter's own routes, built on what only it has, seven each, 140 in all. They
use ground bounces, wall bounces, OTGs, Special cancels, Snap Cancels, Part Tosses and the Legend Arts' two
endings: a raw Art that opens with a bounce, or one that ends a combo in a hard knockdown to OTG. A few examples:
the Pirate's **Pistols and powder** (Point Blank into the wall, BROADSIDE off it: nothing but the gun and the cannons)
and **Keelhaul**; the Ninja's **Hook and blade** (Chain Hook them in, Shadow Slash them away, hook them back);
the Summoner's **Fetch!** and **Imp juggler** (two imps in hand, two throws, two extensions); the Viking's
**Berserker** wind-up; the Bard's **Lullaby**. A trial can start you at range, by a wall, or with imps in hand. The
same DEMO bot proves every one.

**PROFESSIONAL** (the third tab): the longest and hardest-hitting routes in the game, five for every fighter, a hundred
in all, 12 to 22 steps each, using everything at once: a KNOCK//BACK and its rebound, the launcher and an air SPIKE for the
ground bounce, Special cancels, Snap Cancels, Part Tosses (or the Summoner's imps) for extensions (each one gives back a
ground bounce and the OTGs), each fighter's own tricks, and the Legend Arts, raw to open or to end it in a hard
knockdown with an OTG after. They're built the way the game wants: the air part early (the longer a combo runs, the
faster they fall), one wall bounce per wall, and the Special before the first Part Toss (the first part you throw is
your head). Off a wall rebound they launch rather than run a whole string: each hit lifts the target, and by the third
they're out of reach.

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

**Selection Tickets:** your **first Arcade clear** pays one (a collector who cleared it before tickets existed gets
theirs at their next log-in). A ticket picks any **fighter you don't have yet**: a fighter is yours when you own its
whole Standard set, so your starter is, and so is any line whose six Standard parts you pulled. The ticket opens that
fighter's box: all six parts, Standard (any you already had level up), and the figure is ready to fight as at once.
Use it from COLLECTION (SELECTION TICKET, marked 🎫 in the hub), the CAPSULES screen, REWARDS, or straight from the
results of that Arcade clear. The picker shows all ten fighters on one screen, the ones you have greyed out. The hub's
**ACTIVE FIGURE** plate lists your **figures** (every fighter you have) and then your custom slots.

**More ways to win a fighter:**
- **The Arcade's figure of the day:** after your first clear (that one pays the Selection Ticket instead, and doesn't
  count), every Arcade clear unlocks a **random fighter you don't have yet**, once a day.
- **Master a fighter:** clear **every one of its combo trials** (Basic, Advanced and Professional, 22 in all) and that
  fighter is yours. The COMBO TRIALS screen shows how far you are on each fighter you don't own yet (🔒 n / 22).

## Playsets: every figure's own stage

Every figure comes with its own **playset** (`js/playsets.js`), a stage built from its world, with its own floor,
walls, light, scenery and drifting particles (cherry blossom, snow, embers, bubbles, rain...). There are 36 of them
and they have no hazards (the house stages keep those). In the arena picker the house stages are under THE HOUSE and
the playsets under a tab for each series. **HOME GROUND** (Versus) fights on the second figure's playset, and in the
**Arcade** every fight is on the opponent's playset (the bosses still wait on the shelf). RANDOM picks from all 56.

| Figure | Playset | Figure | Playset |
|---|---|---|---|
| Monk | MOUNTAIN TEMPLE | Cannoneer | GUN DECK |
| Viking | LONGHOUSE | Blackbeard | STORM DECK |
| Summoner | SUMMONING CIRCLE | Redbeard | CORSAIR HARBOUR |
| Bard | TAVERN STAGE | Sailor | HARBOUR PIER |
| Samurai | CHERRY BLOSSOM DOJO | Marauder | RAIDED PORT |
| Shinobi | MOONLIT ROOFTOPS | Musketeer | FORT RAMPART |
| Ronin | ROADSIDE TEAHOUSE | Ghost Pirate | DAVY JONES' LOCKER |
| Kunoichi | WISTERIA GARDEN | Wrestler | LUCHA ARENA |
| Shogun | CASTLE KEEP | Baseball | BALLPARK |
| Daimyo | LORD'S COURTYARD | Football | GRIDIRON |
| Knight | CASTLE COURTYARD | Soccer | THE PITCH |
| Paladin | CATHEDRAL | Boxer | TITLE FIGHT |
| Dragoon | DRAGON'S PEAK | Fencer | SALLE D'ARMES |
| Templar | DESERT FORTRESS | Weightlifter | IRON GYM |
| Crusader | SIEGE CAMP | Bowler | BOWLING ALLEY |
| Lancer | THE LISTS | Archer | ARCHERY RANGE |
| Pirate | PIRATE SHIP | Skater | SKATE PARK |
| Captain | QUARTERDECK | Basketball | STREET COURT |

## Arenas and STAGE HAZARDS

**Twenty arenas** (`js/arena.js`, the newer seventeen in `js/arenas.js`), all the same size (a 16 × 12 floor and four
walls that stress, crack and break), each somewhere in the house at toy scale, so the room around the figures is huge:
PLAYROOM SHELF, STUDY DESK, TOY CHEST, TRAIN SET, KITCHEN COUNTER, BATH TIME, CANDY SHOP, RAINY WINDOWSILL (with a
sleeping cat the size of a hill), INSIDE THE FRIDGE, CHECKMATE, ALARM CLOCK, RECORD PLAYER, PINBALL TABLE, NEON ARCADE,
SPEEDWAY, SNOW GLOBE, FISH TANK, DINO DIG, SCIENCE FAIR VOLCANO and MOON BASE. Some have life of their own (rain and
lightning, drifting snow, fish and bubbles, a turning radar dish, a steaming kettle).

**Twelve have a STAGE HAZARD**, always telegraphed before it lands:

| Arena | Hazard |
|---|---|
| Train Set | Every 13 s the crossing lights flash and a train runs through the middle (80 damage and a big launch). |
| Kitchen Counter | The two burners take turns: glowing red is the warning, orange is hot and launches you. |
| Bath Time | The drain at the back gurgles, then blows a water spout that throws you sky high. |
| Candy Shop | A lane lights up and a gumball the size of you rolls down it. |
| Checkmate | The square under someone turns red; a chess piece slams down on it. |
| Alarm Clock | The red second hand sweeps the whole floor every 15 s, low: jump it as it comes. |
| Record Player | The floor turns, carrying you round; now and then the record scratches and whips back and forth. |
| Pinball Table | Three pop bumpers kick you away; a figure flying into one bounces off it harder than off a wall. |
| Speedway | A lane flashes, then a race car jumps the back wall and tears down it. |
| Snow Globe | Every 11 s someone shakes the globe: a two-second gale shoves everyone across the floor. |
| Dino Dig | The T-rex behind the wall roars and stomps: a shockwave rolls across the floor. Jump it. |
| Science Fair Volcano | It erupts every 7 s: glowing circles mark where the rocks land. |

The lanes and squares favour wherever someone is standing. A hazard is nobody's attack: it **never breaks into a
combo** (it skips anyone being comboed, in a Legend Art, invincible or already down), hits the same figure once a
second at most, can finish a fight, and a figure it launches can be caught by the other one. CPUs see hazards coming
and step out of the way or jump (the better the CPU, the more often). A hazard hit spoils a perfect round.

**STAGE HAZARDS** in OPTIONS turns them all off (every arena is then just its floor and walls). Training never has them.
Online, the room's host sets a **STAGE HAZARDS** rule next to the arena, and it travels in the fight's setup (replays
too), so every screen plays the same thing; the hazard's state lives on the match and rewinds with the rollback.

**Picking an arena:** Versus, Training and an online room's rules open a picker with a picture of every arena (rendered
once, the first time you open it), its line, and its hazard (⚠), plus RANDOM. The Arcade's climb now draws each stage
from a pool on the way up the house (the bosses still wait on the top shelf).

## Modes

**The hub** fits on one screen: five buttons, three of which open a short list of their own. **FIGHT** (Arcade,
Versus, Online, Replays), **PRACTICE** (Tutorial, Training, Combo Trials, How to Play; marked NEW until you've done
the tutorial), **COLLECTION** (Workshop, Capsules, Shelf), then **REWARDS** (with its count of rewards ready; COLLECTION also holds a SELECTION TICKET when you have one) and
**OPTIONS**. BACK, Esc or a pad's back button closes a list, and coming back from a mode returns you to the list you
left from.

**ARCADE: THE TOP SHELF** (`js/arcade.js`, the script in `js/story.js`). Built the way story-driven fighting-game
arcades are: every fighter has their own route, scenes before the fights, a rival, a boss, and a hidden route to a true
ending. Lights out in the playroom: the figures wake, and at the top of the bookcase stands the CASE, the one place no
figure is ever sold, boxed or lost. Your figure's Legend Card picks whose story you play, and every fighter climbs
because they lost something (the Samurai's lord, the Pirate's map, the Dragoon's little wyrm...).

- **The climb:** seven fights up through the house (from the toy chest, the train set or the fish tank, up past the fridge, the kitchen, the desk and the clock, to the playroom shelf). Each opens with a short
  **story scene**: two portraits, the speaker lit, the text typing out (click / any key / SKIP). Then a **VS screen**.
- **Stage 4: your RIVAL**, who knows a piece of what you lost (Samurai and Ninja, Knight and Viking, Pirate and Bard,
  Summoner and Paladin, Monk and Dragoon), with its own scene.
- **Stage 7: THE SOVEREIGN**, the gold-edition keeper of the Case (a boss: more HP and defence). Beat it for the
  **NORMAL ENDING**.
- **The hidden route:** reach and beat the Sovereign with **no continues and no more than two rounds lost**, and the
  Case opens. **PROTO-0**, the first figure ever cast (raw grey plastic, no line at all), steps out: the **TRUE FINAL
  BOSS**. It **re-casts its body every round**: a mix of every line, then your rival's body, then a copy of YOU. Beat it
  for the **TRUE ENDING**, where the room gets back everything it lost. The VS screen shows "THE CASE IS WATCHING"
  while the route is still open.
- **Ranks and score:** every win is ranked S to D (victory, speed, HP kept, combo, bounces, wall breaks, a perfect,
  minus rounds lost) and scored (times the difficulty; rival and bosses add a bonus), with your **win quote**. The run
  ends with an overall rank. Win quotes also show on every fight's results.
- **CONTINUE?** with a 9-second countdown when you lose. A continue, a RESTART or quitting mid-fight costs a continue,
  which closes the hidden route for that run.
- **Four difficulties** (EASY, NORMAL, HARD, LEGEND) with a best score for each. A run saves as you go: SAVE & QUIT and
  pick it up later from the Arcade screen.
- **Rewards:** tokens for every stage, a clear bonus (doubled for the true ending), +500 for each fighter's first
  normal ending, +1,000 and a Capsule Ticket for each first true ending, and the Selection Ticket for your first clear.
- **STORIES:** every fighter's prologue, and every ending you've reached, to watch again.

Versus (CPU at four levels, two players on one keyboard / two pads, or
**CPU vs CPU** to watch, with your own builds, any line's figure or random ones; plus an optional fair mode that
ignores rarity bonuses; it remembers your setup) · Training (pick yourself from your figures or any base fighter, the dummy and the arena; dummy settings, full meters, a
combo readout, health back the moment a combo ends, a start by a wall or a SAVED POSITION; R resets and T saves, or tap /
hold a pad's Back button; and the **lab**: inputs, frame data, record and play) ·
Workshop (your custom slots: Custom A and B free, Custom C to F unlocked with tokens for 1,000 / 2,000 / 3,000 /
5,000; your figures, the fighters you have, stay their Standard sets; the hub's ACTIVE FIGURE plate picks which one you fight with) ·
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
| `js/arena.js` | Building an arena (floor, walls, light, scenery) and the walls' stress/cracks/breaks |
| `js/arenas.js` | The seventeen newer arenas, every STAGE HAZARD (sim, CPU warning, meshes), and the arena pictures for the menus |
| `js/lab.js` | Training's lab: the input history, the frame meter and frame advantage, the dummy recording |
| `js/ai.js` | The CPU (plays through the same inputs as a human; picks a combo route and plays it out, takes OTGs and rebounds, steers along walls) |
| `js/gacha.js` | Capsule rates, pity, the 3D machine and reveal |
| `js/auth.js` | Local accounts and the save (tokens, collection, builds, records) |
| `js/input.js` | Keyboard, controllers (type detection, prompts, rebinding, hat d-pads), the input buffer, pad menu navigation |
| `js/menu.js`, `js/hud.js` | Every screen, and the in-fight HUD |
| `js/online.js` | ONLINE: the room list (MQTT), rooms of six over PeerJS (host controls, queue, fighter select, chat), fights between any two members, spectating, rollback netcode (the fight's save/restore, time sync), fingerprints and resync |
| `js/trials.js` | COMBO TRIALS: every trial (Basic, Advanced, Professional for every fighter; the newer lines' routes from `genRoutes`), the step checker, the DEMO bot, and the screens |
| `js/rewards.js` | REWARDS: the counters, the five boards, claiming, and the screen |
| `js/sports.js` | MODERN SPORTS: the ten lines, their parts, moves, passives and mixed-string entries |
| `js/sports_look.js` | Their voxel parts, ready stances and attack poses |
| `js/sports_arts.js` | Their Legend Arts |
| `js/sports_story.js` | Their Arcade stories, rivals, taunts and win quotes |
| `js/edo.js`, `js/realm.js` | The series (KB.THEMES) and EDO JAPAN / KNIGHTS OF THE REALM: their new lines, parts, moves, passives |
| `js/edo_look.js`, `js/realm_look.js` | Their voxel parts and stances (the Lancer's warhorse, `Anim.mounted`) |
| `js/edo_arts.js`, `js/realm_arts.js` | Their Legend Arts (and the Basketball player's) |
| `js/edo_story.js`, `js/realm_story.js` | Their Arcade stories (and the Basketball player's) |
| `js/commands.js` | COMMAND SPECIALS: every figure's three motion Specials (the mechanics are in fighter.js and match.js) |
| `js/sea.js`, `js/sea_look.js`, `js/sea_arts.js`, `js/sea_story.js` | LOVERS OF THE SEA: the crew's lines, figures, Legend Arts and stories |
| `js/story.js` | The Arcade's script: prologues, rivals, the Sovereign, PROTO-0, both endings, taunts and win quotes |
| `js/arcade.js` | ARCADE: the run, story scenes, VS screen, ranks, continues, the hidden route, endings, STORIES |
| `js/tutorial.js` | The TUTORIAL: lesson cards over a live fight, listening to the match's events |
| `tools/harness.js` | Test helpers: step the game at a fixed rate, script inputs, log callouts |
