/* ============================================================================
   story.js -- the Arcade's script: THE TOP SHELF.

   Lights out in the playroom, and the figures wake. At the top of the
   bookcase stands the CASE, the one place no figure is ever sold, boxed or
   lost; only the Champion may stand in it, and the Spring Clear-Out is
   coming. Every fighter climbs for a reason of their own, and every one of
   them has lost something. Their rival knows a piece of it. The Case's
   keeper, the SOVEREIGN, guards it. And inside the Case waits PROTO-0, the
   first figure ever cast, who has kept everything the room ever lost.

   A scene is a list of [speaker, text]. Speakers: 'you' (the fighter whose
   story it is), 'opp' (who you are about to fight), a line key ('ninja'),
   'sov' (the Sovereign), 'proto' (PROTO-0) or 'nar' (the narrator).
   ========================================================================== */
(function () {
  'use strict';

  /* who each fighter's rival is (stage 4) */
  const RIVAL = { samurai: 'ninja', ninja: 'samurai', knight: 'viking', viking: 'knight', pirate: 'bard', bard: 'pirate',
    summoner: 'paladin', paladin: 'summoner', monk: 'dragoon', dragoon: 'monk' };

  /* before an ordinary fight: the other figure says one of its TAUNTS, you answer with one of your REPLIES */
  const TAUNT = {
    samurai: ["You stand like someone who has never been knocked down. Let us fix that.", "A wandering blade has wandered into you. Draw.", "One cut. That is all this needs."],
    knight: ["Halt! None pass the Keep's last knight without a joust!", "My shield has stopped worse than you, and bigger.", "Have at thee! Er. Have at you."],
    pirate: ["Ahoy! Hand over your valuables and I'll only shoot you a little.", "Every figure on this shelf owes me something. You're first.", "Powder's dry, cutlass is sharp. Your luck's the only thing left."],
    monk: ["Your stance is all shoulders. Let me loosen them.", "Breathe in. Now breathe out. Now block.", "I climb for the view. You are in it."],
    viking: ["HA! A small one! Hrolf will make a short saga of you!", "Stand still, so my axe can find you.", "Valhalla is the toy box under the bed. I will show you the way!"],
    ninja: ["You did not hear me arrive. You will not hear me leave.", "A contract is a contract. Nothing personal.", "Look behind you. No. The other behind."],
    summoner: ["My imps have been ever so bored. Will you play with them?", "Eight little friends. Would you like to meet the ninth? So would I.", "Don't step on the circle. Oh. You did."],
    paladin: ["In the name of the Dawn: halt, and be judged!", "My shield has a question for you. It is a heavy one.", "Repent, or rebound. Your choice."],
    dragoon: ["Look up. Higher. Too late.", "I hunt dragons. You will be practice.", "The sky is mine. You may borrow the floor."],
    bard: ["Ooh, a duet! I'll take the melody, you take the beating.", "Hold that pose, I'm writing a verse about your face.", "Every great song needs a villain. Thank you for volunteering!"],
  };
  const REPLY = {
    samurai: ["I have no lord to fight for tonight. Only the climb.", "Step aside, or step into my range.", "My blade is borrowed time. Yours is up."],
    knight: ["By plate and pennant, I will not yield this shelf!", "Stand fast. I am about to shove you very far.", "A knight without a keep still keeps his word. Defend yourself!"],
    pirate: ["Out of my way, landlubber, I'm chasing a map!", "I've fought krakens in the bathtub. You're a puddle.", "Pick a side of the cutlass. Either side hurts."],
    monk: ["Be still. This will be over soon, one way or the other.", "Anger is heavy. Put it down, and fight me light.", "Five fists. Count them, if you can."],
    viking: ["Out of the way! Ironbeard has a saga to finish!", "My crew are watching. Somewhere. Make it a good fight!", "You hit like a bath sponge. Again!"],
    ninja: ["The night is short. So is this.", "You are on my path. Paths can be cleared.", "Nine shadows. You only see one."],
    summoner: ["Come along, little ones, there's someone to bite.", "I'm not really here to fight you. I'm looking for someone.", "You'll want to keep an eye on the floor."],
    paladin: ["Every blow I land mends me. Do keep blocking.", "The Dawn is patient. I am a little less patient.", "Something dark waits on the top shelf. You are simply in the way."],
    dragoon: ["Wherever you are standing, I am already above it.", "Hold still. I need a landing spot.", "A dragoon with no dragon still knows how to fall on things."],
    bard: ["Keep the beat, darling, or the beat keeps you.", "One, two, three, four!", "I've stolen better hats than yours. Ahem. Borrowed."],
  };
  /* WIN QUOTES: after any win (the Arcade's results, and every fight's results screen) */
  const WIN = {
    samurai: ["The cut was finished before you moved.", "Rest. The shelf will still be here tomorrow.", "A clean fight. Thank you."],
    knight: ["Yield, and I shall help you back onto the shelf.", "The wall bent. My shield did not.", "Huzzah! Hm. That was a good one, wasn't it?"],
    pirate: ["Now, about the toll for crossing my shelf...", "Yo ho, and down she goes.", "Never bring a fist to a flintlock fight."],
    monk: ["The far wall taught you more than I could.", "Get up slowly. The floor will wait.", "You fought with your whole heart. Now rest it."],
    viking: ["SKOL! Write that one down, bard!", "The floor shook. That was you. HA!", "Get up! Get up and do it again! That was fun!"],
    ninja: ["You were defeated three moves ago.", "The chain does the talking.", "I was never here."],
    summoner: ["Good imps. Very good imps. Not you, you can go.", "The circle is never wrong.", "Count your fingers. All there? Lovely."],
    paladin: ["Rise, and walk in the light. Gently, you're cracked.", "Judged. And found bouncy.", "The hammer forgives. Eventually."],
    dragoon: ["Lance first. Questions never.", "Grounded. Permanently.", "You should have looked up."],
    bard: ["And the crowd goes wild! The crowd is me.", "That was the chorus. The verse hurts more.", "Encore? No? Suit yourself."],
  };

  /* the opening: the room, then why you climb */
  const OPENING = [
    ['nar', "Lights out in the playroom. On every shelf, the KNOCK//BACK figures wake up."],
    ['nar', "At the very top of the bookcase stands the CASE: glass, gold-trimmed, the one place no figure is ever sold, boxed or lost. Only the Champion may stand in it."],
    ['nar', "The Spring Clear-Out is coming. Tonight, the climb begins."],
  ];
  const INTRO = {
    samurai: ["My lord was lost behind the radiator three winters ago. A blade with no lord is a blade with no purpose.", "If I stand in the Case, at least I will guard something. Up, then. One shelf at a time."],
    knight: ["My Keep went into the attic box last spring. Cardboard towers, a paper flag, all of it gone.", "A knight needs a castle! The Case is glass, but it will do. Onward, and upward!"],
    pirate: ["Some scoundrel filched my treasure map, the one I kept stuck inside my hat!", "Word is a thief's been selling stolen goods up the shelves. I'll climb till I find him, and the Case can be my ship."],
    monk: ["The others climb for glory. I climb because I have never seen the room from the top.", "Each shelf, a lesson. Each opponent, a teacher. Let us go and be taught."],
    viking: ["Three crewmen came in my box. One by one, they went missing. Now Hrolf sails alone!", "A Viking with no crew needs a saga loud enough to call them home. Up the shelves, and LOUDLY!"],
    ninja: ["A voice in the dark left a note in my box: clear the shelves, and the Case's secret is yours.", "I do not ask who hires me. I only ask how many. Tonight: all of them."],
    summoner: ["The Ninefold Circle has nine imps. I have eight. The ninth went missing on the night of the last Clear-Out.", "Something up there tugs at my magic, like a thread. I think it's tugging at the ninth one too."],
    paladin: ["There is a darkness on the top shelf. I have felt it every night since the Case arrived.", "The Dawn sends me to root it out. Anyone who stands in my way will be politely flattened."],
    dragoon: ["A dragoon should ride a dragon. Mine was a little green wyrm, and it vanished from the windowsill.", "From the top of the bookcase you can see everything. If my wyrm is in this room, I'll spot it from the Case."],
    bard: ["Every room needs a song about its Champion. Nobody's written a good one yet.", "So I'll climb, I'll watch, and I'll write it. And if I happen to win? The best songs are autobiographical."],
  };

  /* stage 4: the rival, who knows a piece of what you lost */
  const RIVAL_SCENE = {
    samurai: [['opp', "You have climbed far, wanderer. My contract says you go no higher."], ['you', "Kage. You were in the room the night my lord was lost. I remember your shadow on the radiator."], ['opp', "I was there. I did not take him. Something else did. Something with no colour at all."], ['you', "Then you will tell me everything. After I win."], ['opp', "After you try."]],
    ninja: [['opp', "The shadow that follows me up every shelf. Show yourself, Kage."], ['you', "My contract is to clear the way to the Case. You are in the way, Kaze."], ['opp', "Who holds your contract?"], ['you', "A voice in the dark. It pays well. It does not like questions."], ['opp', "Then I will be the question. Draw."]],
    knight: [['opp', "HA! The tin can with no castle! I remember knocking your Keep off the shelf!"], ['you', "YOU! You are the reason my Keep went into the attic!"], ['opp', "It was a raid! Raids are what Vikings do! I said sorry! ...Did I say sorry?"], ['you', "You did not. Have at you, Ironbeard!"], ['opp', "Now THAT is a saga!"]],
    viking: [['opp', "Hrolf Ironbeard. You owe me a castle."], ['you', "And you owe me a rematch! The last one ended when the castle fell on us both!"], ['opp', "Then let us finish it properly. Here, with nothing left to fall."], ['you', "SKOL! Brackett, you are my favourite enemy!"]],
    pirate: [['opp', "Captain Rook! What a coincidence, meeting you here, by total chance, which it is."], ['you', "Pip Lightfinger. You smell of my hat. Where is my MAP?"], ['opp', "Sold it! To a buyer on the top shelf. Grey fellow, no paint, paid in lute strings."], ['you', "Then I'll take the strings out of your hide. Draw, songbird!"], ['opp', "Oh, this is going in the song."]],
    bard: [['opp', "PIP! You thieving little tune-whistler!"], ['you', "Captain! I can explain! Actually I can't. I'll sing it."], ['opp', "You sold my map to that grey thing at the top of the shelf!"], ['you', "A grey thing that pays very well and never blinks. I think I made a mistake, Captain."], ['opp', "You did. Here comes the next one."]],
    monk: [['opp', "Brother Ox. Every time I land, you are standing underneath me."], ['you', "And every time you leap, you leave the ground behind. Is that not lonely?"], ['opp', "The ground is where you look for things. The sky is where you find them."], ['you', "Then come down from the sky for a while, and let us see what you find."]],
    dragoon: [['opp', "Varek. You are looking up again. What are you hoping to see?"], ['you', "A green wyrm, about this big. You climb slowly, Ox. Move."], ['opp', "Slowly, but I arrive. You fly, and you miss the room passing under you."], ['you', "Then I'll stop and look. Right after I land on you."]],
    summoner: [['opp', "Halt, conjurer! The darkness on the top shelf reeks of your kind of magic."], ['you', "My kind? Dame Aurelia, my imps can barely reach the second shelf without a nap."], ['opp', "Then explain the thread of shadow tied to your circle!"], ['you', "...You can see it too? It isn't mine. Something is pulling it. From up there."], ['opp', "Words are cheap. My hammer is not. Defend yourself!"]],
    paladin: [['opp', "Oh dear. Shiny armour, big hammer, stern face. You're here for me, aren't you?"], ['you', "The darkness is close, Mirelle, and your imps smell of it."], ['opp', "They smell of bottle caps! Whatever's up there took my ninth imp. I'm trying to get it back!"], ['you', "If you speak true, the Dawn will see it in how you fight. Show me."]],
  };

  /* stage 7: the Sovereign, keeper of the Case */
  const SOV_IN = [['nar', "The top shelf. The Case gleams in the dark, and in front of it stands its keeper."],
    ['sov', "I am the Sovereign. I was a gift, and gifts are never given away. I have kept this Case since before you were unboxed."]];
  const SOV_YOU = {
    samurai: "I do not want your Case. I want a reason. Perhaps it is behind you.",
    knight: "Good Sovereign, I challenge you for the Case, by right of plate and pennant!",
    pirate: "Nice glass box. I'll be taking it, and whatever grey thing is hiding inside it.",
    monk: "A beautiful view. I would like to see it from where you are standing.",
    viking: "A GOLDEN one! This will be the best verse of the whole saga!",
    ninja: "My employer wants what is in your Case. I will take it from you.",
    summoner: "There's a thread of my magic running into that Case. Kindly step aside.",
    paladin: "The darkness is behind you, Sovereign. Step aside, or fall with it.",
    dragoon: "You've had the best view in the room for years. Seen a little green wyrm?",
    bard: "Your Majesty! Every song needs a final boss. You'll do beautifully.",
  };
  const SOV_OUT = ['sov', "Then come. The Case is earned. It is never asked for."];

  /* the true route: the Sovereign falls, the Case opens */
  const TWIST = [['nar', "The Sovereign falls. And behind it, the Case begins to rattle."],
    ['sov', "No... you fought too well. It heard you. I kept it locked away for years!"],
    ['nar', "The glass swings open. Something steps out: the grey of raw plastic, with no paint and no line at all."],
    ['proto', "PROTO-0. THE FIRST CASTING. BEFORE THE LINES, BEFORE THE PAINT, THERE WAS ME."],
    ['proto', "EVERY PIECE THIS ROOM HAS EVER LOST, I HAVE KEPT. AND NOW I WILL KEEP YOU."]];
  const PROTO_YOU = {
    samurai: "The lord behind the radiator. That was you. Give him back.",
    knight: "A villain at last! A proper one! Have at thee, grey fiend!",
    pirate: "Grey, no paint, never blinks. You're the one who bought my map.",
    monk: "You have kept everything, and you are still empty. Let me show you something.",
    viking: "My crew! YOU took my crew! Now Ironbeard is ANGRY!",
    ninja: "The voice in the dark. My employer. Our contract is ended.",
    summoner: "There's my thread. It ends inside you. Where is my ninth imp?",
    paladin: "So this is the darkness. Smaller than I expected. Good.",
    dragoon: "I smell wyrm on you. Where is it?",
    bard: "Oh no. You're the buyer. I sold my friend's map to the final boss.",
  };
  const PROTO_OUT = ['proto', "I WILL BECOME EVERY FIGURE ON THIS SHELF. STARTING WITH YOU."];

  /* NORMAL ENDING: the Case is yours, and something is still missing */
  const NORMAL = {
    samurai: [['you', "The Case is mine. It is quiet in here. Very clean."], ['you', "I will guard it, as I once guarded my lord. Perhaps that is enough."], ['nar', "Kaze stands watch in the glass until morning. Behind him, very faintly, something rattles in the dark."]],
    knight: [['you', "Behold, my new Keep! Glass walls, gold trim, and not a speck of cardboard!"], ['you', "It is a little small. And a little cold. But a knight makes do!"], ['nar', "Sir Brackett hums a marching tune all night. Beneath him, something in the Case keeps time."]],
    pirate: [['you', "Captain Rook, master of the top shelf! I can see the whole room from here!"], ['you', "No map, though. Never mind. A captain can always find more treasure."], ['nar', "Rook names the Case his flagship, the Glass Gull. Something grey watches him from below deck."]],
    monk: [['you', "So this is the whole room. The rug, the radiator, the window, the bed."], ['you', "It looks smaller from up here. Everything does. I think I preferred the climb."], ['nar', "Brother Ox sits in the Case until dawn, perfectly at peace, except for a small sound beneath him that he cannot place."]],
    viking: [['you', "Hear me, room! Hrolf Ironbeard is CHAMPION!"], ['you', "...Room? Crew? Anyone?"], ['nar', "The saga is loud, but nobody answers. Somewhere beneath the Case, three tiny voices try to."]],
    ninja: [['you', "The Case is clear. The contract is done."], ['you', "My employer has not come to pay me. Strange. I can feel it watching."], ['nar', "Kage waits in the shadow of the Case. The voice in the dark never speaks to him again. Not yet."]],
    summoner: [['you', "The thread runs right into the floor of the Case. And then it just... stops."], ['you', "Eight imps and a nice glass house. It will have to do, for now."], ['nar', "Mirelle draws her circle on the glass. It never quite closes. The ninth place stays empty."]],
    paladin: [['you', "The Case is taken. The darkness should be gone."], ['you', "...It is not gone. It is quieter. It is waiting."], ['nar', "Dame Aurelia keeps her vigil in the Case, hammer in hand, every night that follows."]],
    dragoon: [['you', "The best view in the room. The rug, the radiator, the windowsill. No wyrm."], ['you', "It isn't out there. So where is it?"], ['nar', "Varek watches the room every night from the top shelf. He never thinks to look down, beneath his own feet."]],
    bard: [['you', "Ladies, gentlemen, figures of every line: your new Champion! Me!"], ['you', "The song's nearly done. It just needs a proper ending. Something is missing."], ['nar', "Pip plays until sunrise. Under the Case, something grey taps along, slightly off the beat."]],
  };
  /* TRUE ENDING: PROTO-0 breaks, and the room gets back what it lost */
  const TRUE_IN = ['nar', "PROTO-0 cracks apart, and everything this room has ever lost comes spilling out of it."];
  const TRUE = {
    samurai: [['you', "My lord. You were in here all along."], ['nar', "A tiny figure in lacquered armour blinks up at Kaze. \"You kept climbing,\" it says. \"Of course you did.\""], ['you', "I had nowhere else to go, my lord. Now I do."], ['nar', "The Case stays empty after that. Kaze and his lord take the shelf below it, where the light is better."]],
    knight: [['you', "My pennant! The Keep's own flag, safe and sound!"], ['nar', "Among the lost things lies a folded paper flag, and behind it, a cardboard tower someone rescued from the attic box."], ['you', "A Keep needs no glass walls. Only someone to keep it."], ['nar', "Sir Brackett rebuilds the Keep on the middle shelf. Hrolf helps, mostly by apologising."]],
    pirate: [['you', "My map! And it's been marked! X marks the spot... under the bed?"], ['nar', "Under the bed: forty-one lost marbles, a coin, and one very old jelly bean."], ['you', "Treasure! Real treasure! Pip! Get over here, you're writing the shanty!"], ['nar', "Captain Rook shares the marbles with every figure in the room. He keeps the jelly bean."]],
    monk: [['you', "You were cast before anyone. Before any line. You were alone the whole time."], ['nar', "PROTO-0 does not shatter. It sits down, grey and still, across from Brother Ox."], ['you', "Breathe in. Breathe out. There. That is all there is to it."], ['nar', "The first figure and the gentlest one sit together until sunrise. The lost things find their own way home."]],
    viking: [['you', "MY CREW! Sven! Little Sven! Other Sven!"], ['nar', "Three tiny Vikings tumble out of the grey wreckage, all shouting at once."], ['you', "Now the saga has an ending! Pip! PIP! Write down that I wept manfully!"], ['nar', "The longship sails again across the rug, every night. The crew row. Hrolf sings. Badly."]],
    ninja: [['you', "My contract was with you. My contract is ended."], ['nar', "In the wreckage, Kage finds a note in his own handwriting, from before the voice found him: \"Remember who you are.\""], ['you', "Kage of the Ninth Night. I protect this room. No one hires me for that."], ['nar', "From then on every shadow in the playroom belongs to the room, and the room sleeps safely."]],
    summoner: [['you', "There you are! Oh, you're all dusty. Who's a good imp? You are."], ['nar', "The ninth imp leaps into Mirelle's arms, and the circle closes for the first time in a year."], ['you', "Nine. The Ninefold Circle. Dame Aurelia, I believe you owe me an apology."], ['nar', "The Paladin apologises. The ninth imp bites her anyway. They are good friends after that."]],
    paladin: [['you', "The darkness is broken. It was only ever lonely, and grey."], ['nar', "Morning light catches the Case. For the first time, it shines on nothing hiding."], ['you', "Mirelle. I misjudged you. The Dawn forgives, and so, I hope, do you."], ['nar', "Dame Aurelia leaves the Case open. A case is a cage, she says, however pretty."]],
    dragoon: [['you', "Wyrm! You're alive! You're tiny! You've always been tiny!"], ['nar', "A little green dragon claws its way out of the grey dust and climbs straight onto Varek's helmet."], ['you', "Hold on. We have a whole room to fly over."], ['nar', "From then on the high shelves belong to a dragoon and his dragon. They never miss a sunrise."]],
    bard: [['you', "The Captain's map, the Viking's crew, a little wyrm... I can give it all back."], ['nar', "Pip hands out every lost thing to its owner, one by one, until his pockets are empty for the first time in his life."], ['you', "And now, the song. It's about a room that lost things, and the night it got them back."], ['nar', "The whole playroom listens. It is, everyone agrees, the best song ever written on a shelf."]],
  };

  const pick = (arr, seed) => arr[Math.abs(seed | 0) % arr.length];
  window.Story = {
    RIVAL, TAUNT, REPLY, WIN, INTRO, RIVAL_SCENE, SOV_YOU, PROTO_YOU, NORMAL, TRUE,
    opening: line => [...OPENING, ...INTRO[line].map(t => ['you', t])],
    /* an ordinary fight: their taunt, your reply (seed: the run and stage, so a scene stays the same on a retry) */
    prefight: (line, opp, seed) => [['opp', pick(TAUNT[opp], seed)], ['you', pick(REPLY[line], seed >> 2)]],
    rival: line => RIVAL_SCENE[line],
    sovereign: line => [...SOV_IN, ['you', SOV_YOU[line]], SOV_OUT],
    twist: line => [...TWIST, ['you', PROTO_YOU[line]], PROTO_OUT],
    normal: line => NORMAL[line],
    trueEnd: line => [TRUE_IN, ...TRUE[line]],
    win: (line, seed) => pick(WIN[line], seed),
  };
})();
