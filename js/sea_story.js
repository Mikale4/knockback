/* ============================================================================
   sea_story.js -- THE TOP SHELF for the LOVERS OF THE SEA crew (story.js
   explains a scene). Each came out of the box missing something, and PROTO-0
   has it.
   ========================================================================== */
(function () {
  'use strict';
  const S = Story;
  Object.assign(S.RIVAL, { blackbeard: 'redbeard', redbeard: 'blackbeard', captain: 'ghost', ghost: 'captain', sailor: 'marauder', marauder: 'sailor', musketeer: 'cannoneer', cannoneer: 'musketeer' });

  Object.assign(S.TAUNT, {
    captain: ["All hands! We've a boarder.", "I've had you in the glass since the bottom shelf.", "Strike your colours, or I'll strike them for you."],
    cannoneer: ["Stand clear of the muzzle. Or don't.", "Fire in the hole!", "I can hit a gull at three hundred yards. You're closer."],
    blackbeard: ["You've heard the stories. They're all true.", "Look at the smoke, friend. Look at it.", "Six pistols. Count them as they go."],
    redbeard: ["The whole sea knows this beard.", "My fleet has taken bigger prizes than you.", "Your back is to the wall. Good."],
    sailor: ["Put 'em up, matey!", "I've been in worse brawls in better ports.", "Heave, ho, and down you go."],
    marauder: ["Everything you're wearing is mine now.", "Grapnels away!", "I'll take that arm. And that one."],
    musketeer: ["Make ready. Present.", "One shot is all I need. Then the bayonet.", "Front rank, kneel. That means you."],
    ghost: ["You can't kill what's already drowned.", "Cold, isn't it? It gets colder.", "Come down to the locker. There's room."],
  });
  Object.assign(S.REPLY, {
    captain: ["Steady as she goes.", "My ship is somewhere above. You're between me and her.", "Run out the guns."],
    cannoneer: ["Load, ram, prime, FIRE.", "My ears ring. I like it.", "Linstock's lit. Let's go."],
    blackbeard: ["Let them talk about this one too.", "The fuses are short. So is my patience.", "Come here and let me look at you."],
    redbeard: ["Barbarossa does not lose prizes.", "To the oars!", "I've cornered whole fleets. You're one boat."],
    sailor: ["Me and my pin, mate. Me and my pin.", "Hornpipe's playing. Let's dance.", "I've swabbed decks tougher than you."],
    marauder: ["Grapple, haul, take.", "That's a nice part. It'll look better on me.", "Over the side with you."],
    musketeer: ["By rank, fire!", "The marines are here.", "Hold the line."],
    ghost: ["I remember fighting. I don't remember losing.", "The tide's coming in.", "Do I know you? I don't know anyone."],
  });
  Object.assign(S.WIN, {
    captain: ["Log it: a fine engagement.", "Strike your colours. Well fought.", "Prize taken."],
    cannoneer: ["Direct hit.", "Swab the barrel. Reload.", "Boom."],
    blackbeard: ["Tell them Teach did it.", "Breathe the smoke. Remember it.", "Six of six."],
    redbeard: ["Another prize for the fleet.", "The admiral is satisfied.", "Never fight Barbarossa at sea. Or on a shelf."],
    sailor: ["Ha! Down she goes!", "Good scrap, mate. Good scrap.", "Shiver me timbers, that was fun."],
    marauder: ["Mine.", "I'll keep the arm.", "Plunder's plunder."],
    musketeer: ["Target down.", "Cease fire.", "The line held."],
    ghost: ["Rest easy. Down there.", "Another for the locker.", "...I almost remember my name."],
  });
  Object.assign(S.INTRO, {
    captain: ["My set came with a ship in a bottle: the Gull, all three masts, rigged to the last line. She was my command.", "This morning the bottle's on the shelf and the Gull isn't in it. Somebody's sailing my ship. Not for long."],
    cannoneer: ["Every gun crew keeps one gold-painted ball for the salute. Ours came in the box, polished, in its own little rack.", "Rack's empty. Somebody's got my salute. Somebody's going to get a lot of salutes."],
    blackbeard: ["My flag came in the box with me. Black, the horned skeleton with the hourglass. The flag that made whole crews give up.", "This morning: a pole, and no flag. A pirate's no pirate without his colours. I'm going up for them."],
    redbeard: ["The admiral's ring: the seal of my fleet, gold and green. It was on my finger when the box was closed.", "When I woke, a pale finger. The sea does not take my ring. Neither does this shelf."],
    sailor: ["A sailor always knows his way home. That's what the compass is for, and mine came in my pocket.", "Pocket's empty. So I'll go up, and I'll keep going up, until somebody gives me back north."],
    marauder: ["My map came in the box. X marks the spot. Every raider's map has an X, and mine had the best one.", "Somebody took it. Somebody's going to find what's at the X. I'll be there first."],
    musketeer: ["My musket came with its ramrod. No ramrod, no reloading. I've been making do with a chopstick.", "A marine does not reload with a chopstick. Somewhere up there is my ramrod, and I will have it."],
    ghost: ["I came out of a dark green box. There was a nameplate on it, brass, with my name. I... think there was.", "I don't remember my name. Somebody has the nameplate. Somebody up there knows who I was."],
  });
  Object.assign(S.RIVAL_SCENE, {
    blackbeard: [['opp', "Teach. Smoke in your beard, and you call that fearsome?"], ['you', "Barbarossa. A red beard and a turban, and you call that a pirate?"], ['opp', "I am an ADMIRAL. My ring is missing, and your flag, I hear."], ['you', "Then we'll find out which beard the grey thing fears more."]],
    redbeard: [['opp', "Redbeard! The corsair! In my waters!"], ['you', "Your waters? I have sailed every sea, Teach. This shelf is a puddle."], ['opp', "Somebody took my flag. You've the look of a man who takes flags."], ['you', "I take FLEETS. Draw, and I'll show you the difference."]],
    captain: [['opp', "A captain. I remember captains. I think I was one."], ['you', "You're a ghost. And your coat's cut like a captain's, from a hundred years ago."], ['opp', "I lost my name. You lost your ship. The grey thing has both, I'd wager."], ['you', "Then we fight, and the winner asks it for both."]],
    ghost: [['opp', "A ghost on my shelf. You're dripping on my deck."], ['you', "...Have we met, Captain? I feel like I've stood on your deck."], ['opp', "No. And you're not going to, not with that lantern."], ['you', "Then let me remember the hard way."]],
    sailor: [['opp', "A sailor with a stick. Give me your pockets."], ['you', "Pockets are empty, mate. Somebody beat you to it."], ['opp', "Then I'll take the stick."], ['you', "Come and get it, then."]],
    marauder: [['opp', "Oi! You're the one who's been nicking everyone's things!"], ['you', "Not everyone's. I'm missing my own map, sailor."], ['opp', "Somebody's got my compass. Same somebody, I reckon."], ['you', "Then let's see who gets up there first."]],
    musketeer: [['opp', "A marine with a musket, and no ramrod. You'll want this match, then."], ['you', "Gunner. I'd rather a ramrod than a burning stick."], ['opp', "And I'd rather my gold ball than a fight, but here we are."], ['you', "Make ready, then."]],
    cannoneer: [['opp', "A gun crew of one. Where's your ball, gunner?"], ['you', "Gone. Same as your ramrod, marine."], ['opp', "Then we've both got empty racks."], ['you', "And plenty of powder. Stand clear!"]],
  });
  Object.assign(S.SOV_YOU, {
    captain: "Golden and anchored at the top. Strike your colours, Sovereign.",
    cannoneer: "Big gold target. Can't miss.",
    blackbeard: "Gold, eh? Gold sinks too.",
    redbeard: "A golden prize at the top of the shelf. The fleet approves.",
    sailor: "You're a big shiny one, mate. Put 'em up.",
    marauder: "I'm taking that gold. Piece by piece.",
    musketeer: "Front rank: present. Target: gold.",
    ghost: "Gold. I remember gold. Down in the dark it's all the same colour.",
  });
  Object.assign(S.PROTO_YOU, {
    captain: "The Gull! You've got my ship in your hand like a toy. She's NOT a toy.",
    cannoneer: "That's my gold ball. You've been using it as a HEAD.",
    blackbeard: "My flag. You're wearing it as a cape. Take it off before I take it off you.",
    redbeard: "My ring. On a grey finger. The sea takes that back now.",
    sailor: "That's my compass. It's pointing at me. Hand it over, mate.",
    marauder: "My map! And you've drawn on it. You've drawn ANOTHER X.",
    musketeer: "My ramrod. You're using it as a FLAGPOLE.",
    ghost: "...That nameplate. On your chest. Read it to me. Please.",
  });
  Object.assign(S.NORMAL, {
    captain: [['you', "The highest point on the shelf. A fine crow's nest."], ['you', "No ship, though. A captain without a ship."], ['nar', "Isadora watches the window all night. In the Case, something grey shakes a bottle with a little ship inside."]],
    cannoneer: [['you', "Top shelf. Fire a salute!"], ['you', "...With what? Somebody's got my ball."], ['nar', "Boom fires a blank anyway. Down in the Case, something grey jumps."]],
    blackbeard: [['you', "Top of the shelf, and no colours to fly from it."], ['you', "They'll still tell the stories."], ['nar', "Teach smokes until dawn. Below, a little black flag flutters in the Case."]],
    redbeard: [['you', "The summit. The admiral's view."], ['you', "And a bare finger."], ['nar', "Barbarossa waits for a fleet that doesn't come. In the Case, a gold and green ring glints on a grey hand."]],
    sailor: [['you', "Made it, mates! Top of the rigging!"], ['you', "...Now which way's home?"], ['nar', "Jack dances a hornpipe to nobody. In the Case, something grey turns a compass round and round."]],
    marauder: [['you', "Top of the shelf. Everything below is mine."], ['you', "But not the X. Never found the X."], ['nar', "Hask counts his plunder. In the Case, something grey traces a map with its finger."]],
    musketeer: [['you', "Objective taken."], ['you', "Still reloading with a chopstick, though."], ['nar', "Margot stands sentry until morning. In the Case, a ramrod holds up a tiny grey flag."]],
    ghost: [['you', "The top. Cold up here. Cold everywhere."], ['you', "I still don't know who I am."], ['nar', "The Drowned Captain drifts in the moonlight. In the Case, something grey polishes a brass nameplate it cannot read."]],
  });
  Object.assign(S.TRUE, {
    captain: [['you', "The Gull! Every mast, every line!"], ['nar', "Isadora uncorks the bottle and the little ship slides out onto the top shelf, sails filling with the draught from the window."], ['you', "All hands! Make sail!"], ['nar', "The whole shelf comes aboard."]],
    cannoneer: [['you', "My gold ball! Still shiny!"], ['nar', "Boom loads it, primes it, and fires the salute out of the window, into the morning."], ['you', "...Ah. I should've kept that one."], ['nar', "PROTO-0 brings it back, rolling it across the floor like a puppy."]],
    blackbeard: [['you', "My colours."], ['nar', "Teach runs the black flag up the top shelf's lamp. It hangs there over the whole playroom."], ['you', "NOW tell the stories."], ['nar', "They do."]],
    redbeard: [['you', "The admiral's ring."], ['nar', "Barbarossa slides it on, and every sea-figure on the shelf, without quite knowing why, salutes."], ['you', "The fleet is assembled."], ['nar', "And PROTO-0 joins it, as cabin boy."]],
    sailor: [['you', "My compass! Hello, north!"], ['nar', "The needle swings, wobbles, and points straight at the little bed in the corner of the room."], ['you', "...Huh. That's home, then."], ['nar', "Jack walks home whistling."]],
    marauder: [['you', "My map. And... a new X?"], ['nar', "Under PROTO-0's grey X, in tiny letters: TREASURE = FRIENDS. Hask looks at it for a long time."], ['you', "...Worst treasure I ever found."], ['nar', "He keeps the map anyway, folded small, in his chest."]],
    musketeer: [['you', "My ramrod! Make ready, present, FIRE!"], ['nar', "Margot loads, rams, and fires a perfect volley of one, then reloads in a heartbeat."], ['you', "Never again, chopstick."], ['nar', "She salutes PROTO-0, who salutes back, very badly."]],
    ghost: [['you', "Read it. Please."], ['nar', "PROTO-0 holds up the brass nameplate. It says CAPTAIN AMOS GREY."], ['you', "Grey. Like you... Amos Grey. That's me. That was me."], ['nar', "And for the first time since the box, the Drowned Captain is warm."]],
  });
})();
