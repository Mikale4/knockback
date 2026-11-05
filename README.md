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

## Controls

| Action | Keyboard P1 | Keyboard P2 | Xbox | PlayStation |
|---|---|---|---|---|
| Move | Arrow keys | I J K L | Left stick / d-pad | Left stick / d-pad |
| Light (R-ARM string) | Z | Num 1 or `,` | X | □ |
| Heavy / KNOCK (L-ARM) | X (hold to charge) | Num 2 or `.` | Y | △ |
| Guard (+ Light = Grab, + Special = Part Toss) | C | Num 3 or `/` | RB | R1 |
| Head Special | A | Num 5 or `;` | LB | L1 |
| Snap Cancel / Spring Burst | D | Num 4 or `'` | RT | R2 |
| Legend Art (super) | S | Num 6 or `]` | LT | L2 |
| Jump | Space | Num 0 or R-Shift | A | ✕ |
| Dodge / Tech | L-Shift | Num . or `\` | B | ○ |
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
- **OTG (off the ground)** — once a combo, a hit can pick a knocked-down opponent back up off the floor ("OTG!"): a
  Heavy, a dash attack, a dive (air Heavy), a sweep or a downward shot. They're scooped into the air and the combo
  carries on. Quick Rise (Dodge as you land) gets out of it.
- **Part Toss** (Guard + Special) — pull a part off your own figure and throw it: the head first, then the L-arm, then
  the R-arm. It works as a cancel off any hit. A toss that lands **extends the combo** ("EXTEND 1/2"): its clock and
  decay start over, and you get a fresh OTG and ground bounce. Twice a combo at most: combo, toss, combo, toss, final
  combo. The part lands on the floor; go and snap it back on (before they take it, see Parts).

## Legend Arts (supers)

100 Hype. The screen freezes for the flash, then the Art tries to **catch** — each in its own way — and if it does,
it plays a **full cinematic**: black bars, its own camera shots, and the last blow lands with a freeze, a flash and
its name. The clock and the CPUs wait while it plays.

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
| Dragonfall (Dragoon) | a leap out of sight, a reticle that locks on, the dive | skewered, carried up, three dives, and the spirit dragon's own |
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
| Viking (Axe) | Hack › Hew › Whirlwind (hits all around) | Skull Splitter (ground bounce) | Chop › Axe Drill (spinning dive) | **Wind-up**: hold Light on any swing for armour, +60% damage, a crumple |
| Ninja (Tantō) | Flick › Backflick › Vanishing Stab (blinks behind, once a combo) › Shadow Slash | Kunai Toss | Flick › Backflick › Kunai Rain | **Shadow Dash**: Dodge after an air hit to dash at them |
| Summoner (Staff) | Staff Jab › Staff Swing › Sic 'Em (every imp attacks) › Conjure Bolt | Call Imp | Swing › Spirit Bolt (spike) | **Pack Tactics**: her imps pounce on anyone she hits |
| Paladin (Warhammer) | Smite › Hammer Fall › Consecrate (holy shockwave all around) | Hallowed Strike (crumples, heals big) | Smite › Meteor Hammer (dive) | **Lay on Hands**: string hits heal her |
| Dragoon (Lance) | Thrust › Twin Thrust › Wheel Sweep › Rising Lance | Impaling Lunge | Thrust › Dragon Dive | **Skyborne**: Jump off an air hit for a fresh jump and air string |
| Bard (Lute) | Strum › Twang › Power Chord › Encore! | Lullaby (puts them to sleep) | Strum › Crescendo | **On the Beat**: start a Light on the music's beat for +30% damage |

**The Summoner's imps** come from her Special (two at a time), the Call Imp pause branch, and the FAMILIAR legs (one
at the start of every round). They walk in and bite, pounce on whatever she hits, and all go in at once on Sic 'Em.
She keeps **two at most** (a new one replaces the oldest). Any attack that touches one hurts it: **two hits** pop it,
and otherwise each one **leaves after 5 seconds** (it blinks in its last second). The LEGION card makes them bite 30%
harder.

**Projectiles** fly as real things you can see: the Pirate's pistol ball (with a muzzle flash and a kick up the arm),
the Ninja's kunai (they stick in walls), the Summoner's spirit bolts and her Hex glyph, the Bard's sound waves with
notes riding on them, and the Ninja's **Chain Hook** (the weighted chain flies out, whips round them, and the Ninja
yanks them in along the floor). Every one is aimed: it leads a moving target, finds them high, low or on the floor,
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

## Modes

Arcade (six figures from the ten lines, the last one a Chase boss) · Versus (CPU at four levels, two players on one keyboard / two pads, or
**CPU vs CPU** to watch, with your own builds, any line's figure or random ones; plus an optional fair mode that
ignores rarity bonuses) · Training (dummy settings, full meters, combo readout) ·
Workshop (three builds) · Shelf (collection and records).

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
| `js/ai.js` | The CPU (plays through the same inputs as a human; picks a combo route and plays it out, takes OTGs and rebounds, steers along walls) |
| `js/gacha.js` | Capsule rates, pity, the 3D machine and reveal |
| `js/auth.js` | Local accounts and the save (tokens, collection, builds, records) |
| `js/input.js` | Keyboard, controllers (type detection, prompts, rebinding, hat d-pads), the input buffer, pad menu navigation |
| `js/menu.js`, `js/hud.js` | Every screen, and the in-fight HUD |
| `tools/harness.js` | Test helpers: step the game at a fixed rate, script inputs, log callouts |
