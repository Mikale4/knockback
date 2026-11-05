# KNOCK//BACK

A voxel arena fighter where the fighters are **action figures** of famous warriors — Samurai, Knight, Pirate, Monk,
Viking, Ninja — and every figure is six snap-on parts you can mix freely.

**The gimmick is the name:** launch someone into a wall and they **bounce back off it**, still helpless, so you can keep
the combo going and knock them back into the wall again. The ways out of that loop are taken from Guilty Gear.

**Play:** https://mikale4.github.io/knockback/ (keyboard or gamepad). Your collector and collection are saved in your browser.

## Run it locally

Open `index.html` through any static server, for example:

```
python tools/serve.py 8766
```

then visit http://localhost:8766. (The server sends no-cache headers so edits show up on reload.) No build step;
plain JavaScript and Three.js (`lib/three.min.js`).

## Controls

| Action | Keyboard P1 | Keyboard P2 | Gamepad |
|---|---|---|---|
| Move | WASD | Arrows | Left stick / d-pad |
| Light (R-ARM string) | J | Num 1 or `,` | X |
| Heavy / KNOCK (L-ARM) | K (hold to charge) | Num 2 or `.` | Y |
| Guard (+ Light = Throw) | L | Num 3 or `/` | RB |
| Head Special | I | Num 5 or `;` | LB |
| Snap Cancel / Spring Burst | U | Num 4 or `'` | RT |
| Legend Art (super) | O | Num 6 or `]` | LT |
| Jump | Space | Num 0 or R-Shift | A |
| Dodge / Tech | L-Shift | Num . or `\` | B |
| Pause / move list | Esc | | Start |

Every key can be rebound in **Options**.

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
| Ninja (Tantō) | Flick › Backflick › Vanishing Stab (blinks behind) › Shadow Slash | Kunai Toss | Flick › Backflick › Kunai Rain | **Shadow Dash**: Dodge after an air hit to dash at them |

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
arm falls back on weak stump attacks, no head means no Special, cracked legs slow you down. Match 3+ parts to your
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

Arcade (six figures, last one a Chase boss) · Versus (CPU at four levels, two players on one keyboard / two pads, or
**CPU vs CPU** to watch, with your own builds, any line's figure or random ones; plus an optional fair mode that
ignores rarity bonuses) · Training (dummy settings, full meters, combo readout) ·
Workshop (three builds) · Shelf (collection and records).

## Files

| File | What's in it |
|---|---|
| `js/parts.js` | Lines, slots, rarities, every move's frame data, part stats, `KB.stats(build)` |
| `js/models.js` | The voxel art for every part, the shared peg skeleton, icons, Legend Card art |
| `js/anim.js` | Stances and per-move poses |
| `js/fighter.js` | The fighter state machine and `Combat` (hits, guard, wall bounce/tech/break, part breaks) |
| `js/match.js` | Rounds, camera, projectiles, dropped parts, ring outs, supers, training |
| `js/arena.js` | The three arenas and wall stress/cracks/breaks |
| `js/ai.js` | The CPU (plays through the same inputs as a human) |
| `js/gacha.js` | Capsule rates, pity, the 3D machine and reveal |
| `js/auth.js` | Local accounts and the save (tokens, collection, builds, records) |
| `js/menu.js`, `js/hud.js` | Every screen, and the in-fight HUD |
| `tools/harness.js` | Test helpers: step the game at a fixed rate, script inputs, log callouts |
