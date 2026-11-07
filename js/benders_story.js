/* ============================================================================
   benders_story.js -- THE TOP SHELF for the ELEMENT BENDERS (story.js
   explains a scene). Each came out of the box missing something, and PROTO-0
   has it.
   ========================================================================== */
(function () {
  'use strict';
  const S = Story;
  Object.assign(S.RIVAL, { flame: 'water', water: 'flame', air: 'earth', earth: 'air', storm: 'blast', blast: 'storm', blood: 'spirit', spirit: 'blood', lava: 'metal', metal: 'lava', swamp: 'lava' });

  Object.assign(S.TAUNT, {
    air: ['Catch me first.', 'You hit like a breeze. I am the breeze.', 'Up we go!'],
    water: ['Push water and it just flows round you.', 'Cold enough for you yet?', 'Every hit flows into the next one.'],
    earth: ['I\'ve stood here longer than this shelf.', 'Go on. Hit the mountain.', 'The ground is on my side.'],
    flame: ['Feel that? That\'s me warming up.', 'Stay close. I dare you.', 'Everything burns. Even plastic.'],
    blood: ['Don\'t bother running. Your legs are mine.', 'I can feel your heart from here.', 'Dance for me.'],
    lava: ['Touch me. Go on.', 'Rock that remembers being fire.', 'You\'re standing on my floor now.'],
    storm: ['Count the seconds after the flash.', 'Every fifth hit, you stop. Count them.', 'The sky\'s on my side.'],
    blast: ['Stand back. Further.', 'Did you hear that tick?', 'Walls are just suggestions.'],
    metal: ['There\'s iron in your joints. I can feel it.', 'Hit me. I\'ll ring.', 'Into the wall with you.'],
    spirit: ['You\'re not where you think you are.', 'The lanterns know your name.', 'Swing at me. I\'ll be behind you.'],
    swamp: ['Watch your step. The mud\'s hungry.', 'Roots go deeper than you think.', 'Everything ends up in the bog.'],
  });
  Object.assign(S.REPLY, {
    air: ['Light feet, light heart.', 'The wind\'s picking up.', 'Nine winds, one of me.'],
    water: ['Flow, then freeze.', 'The tide is in.', 'I heal faster than you hit.'],
    earth: ['Plant your feet.', 'I don\'t move. You do.', 'Stone doesn\'t argue.'],
    flame: ['Breathe in. Burn.', 'Hotter.', 'I was lit before you were boxed.'],
    blood: ['Such a strong pulse.', 'Come closer. You will anyway.', 'Strings, everywhere.'],
    lava: ['I cool slow.', 'Stay out of the flow.', 'Obsidian doesn\'t crack.'],
    storm: ['Charged and ready.', 'Flash, then thunder.', 'Ground yourself. It won\'t help.'],
    blast: ['Fuse is lit.', 'Boom comes later.', 'I\'ll knock the wall down too.'],
    metal: ['Steel bends to me. You will too.', 'Clamp down.', 'Ironhand.'],
    spirit: ['The lanterns are lit.', 'I see what\'s inside you.', 'Two worlds. Pick one.'],
    swamp: ['Slow down. You\'re in my bog.', 'The roots are listening.', 'Mud never lets go.'],
  });
  Object.assign(S.WIN, {
    air: ['Light as air.', 'Blown away.', 'The wind always wins.'],
    water: ['Washed out.', 'The tide goes out.', 'Cool off.'],
    earth: ['The mountain stands.', 'Down to bedrock.', 'Back in the ground.'],
    flame: ['Burnt out.', 'Embers.', 'Still warm.'],
    blood: ['Strings cut.', 'Your heart slowed down. I let it.', 'Bow.'],
    lava: ['Cooled.', 'Set in stone.', 'Molten.'],
    storm: ['Grounded.', 'Flash. Thunder. Done.', 'Lights out.'],
    blast: ['Kaboom.', 'Clear the debris.', 'Tick, tick... done.'],
    metal: ['Stuck.', 'Forged.', 'Iron wins.'],
    spirit: ['Rest now.', 'The lanterns go dark.', 'Back to your world.'],
    swamp: ['Swallowed.', 'Sink.', 'The bog keeps what it takes.'],
  });
  Object.assign(S.INTRO, {
    air: ['My set came with a paper kite on a silver thread. I flew it off the top of the box every morning.', 'This morning the thread\'s cut. Somebody took my kite up to the top shelf, and I can fly higher than any of them.'],
    water: ['My set came with a little glass flask with a drop of real water in it. The only real water on the whole shelf.', 'It\'s gone. Without it, everything I bend is plastic pretending. Somebody up there has my water.'],
    earth: ['My set came with a lucky stone. A real pebble, from outside. I\'ve kept it in my fist since the day I was boxed.', 'I opened my hand this morning and it was empty. I don\'t lose things. Somebody took it.'],
    flame: ['My set came with a candle stub. I lit it every night so the shelf wasn\'t dark.', 'Last night it went out, and when I looked, it was gone. Someone wants the shelf dark. I don\'t.'],
    blood: ['My set came with a crescent moon on a chain. Under it, my strings are strongest.', 'Someone unhooked it from my neck while I slept. I didn\'t feel them. That has never happened before.'],
    lava: ['My set came with an obsidian egg that glows when it\'s warm. I kept it warm.', 'It\'s cold and gone. Something up there has my egg, and I am going to be very warm about it.'],
    storm: ['My set came with a coin battery. It\'s what lights my eyes when I\'m angry.', 'It\'s missing, and my eyes are still lit. That\'s how angry I am.'],
    blast: ['My set came with a tin of party snaps. Little pops. Harmless. I loved them.', 'The tin is empty. Somebody\'s playing with my snaps, and they don\'t know which ones aren\'t harmless.'],
    metal: ['My set came with a horseshoe magnet. Red, with silver tips. It always knew where north was.', 'It\'s been taken, and for the first time I can feel something up there pulling. My magnet is on the top shelf.'],
    spirit: ['My set came with a paper lantern. When I lit it, the lost ones on the shelf could find their way.', 'It\'s gone, and the lost ones are wandering. Somebody has my lantern, and they don\'t know what follows it.'],
    swamp: ['My set came with a jar of moss with a tiny frog in it. Well, a painted frog. But I talked to it.', 'The jar\'s gone. Someone up there has my frog, and they\'d better be talking to it.'],
  });
  Object.assign(S.RIVAL_SCENE, {
    flame: [['opp', 'Oh, it\'s you. Here to dry me out?'], ['you', 'Here to light the shelf. You can help or you can steam.'], ['opp', 'Fire and water on the same shelf. Someone was asking for trouble.'], ['you', 'Then let\'s give it to them, after I give it to you.']],
    water: [['opp', 'Careful. You\'ll put me out.'], ['you', 'That\'s the idea, hothead.'], ['opp', 'Somebody took your water, didn\'t they? Mine too. My candle.'], ['you', 'Then we both want up. Only one of us is going.']],
    air: [['opp', 'Floating up there again, are you?'], ['you', 'Someone has to see where they took everything. You can\'t from down there.'], ['opp', 'I don\'t need to see it. I need to stand in front of it.'], ['you', 'You\'ll have to stand in front of me first.']],
    earth: [['opp', 'Little leaf. You\'ll blow away.'], ['you', 'And you\'ll never get off the ground.'], ['opp', 'My stone is up there. I\'ll climb.'], ['you', 'Climb fast, then. I\'m already going.']],
    storm: [['opp', 'Let me guess. Something went bang and you\'re here to blame me.'], ['you', 'Something went missing, and you\'re the loudest thing on this shelf.'], ['opp', 'My snaps are gone too. Fine. We settle it the loud way.'], ['you', 'Count the seconds after the flash.']],
    blast: [['opp', 'All that noise. You\'ll wake the whole case.'], ['you', 'Good. Somebody up there took my snaps.'], ['opp', 'And my battery. Somebody\'s collecting our sparks.'], ['you', 'Then whoever wins this lights the fuse on them.']],
    blood: [['opp', 'You\'re the one who walks the dead home.'], ['you', 'And you\'re the one who walks the living where they don\'t want to go.'], ['opp', 'My moon is gone. Your lantern too, I hear.'], ['you', 'Then let\'s see whose light is stronger.']],
    spirit: [['opp', 'You can\'t pull what isn\'t there.'], ['you', 'Everything has a pulse. Even you, lantern girl.'], ['opp', 'Someone has your moon. Someone has my lantern. Same someone.'], ['you', 'Then step aside and let me get it first.']],
    lava: [['opp', 'You\'re going to melt on me, aren\'t you?'], ['you', 'Only the parts of you that are iron.'], ['opp', 'My magnet\'s up there. It pulls. You feel it too?'], ['you', 'I feel heat. Let\'s make some.']],
    metal: [['opp', 'Iron. I love iron. It melts so nicely.'], ['you', 'Not this iron.'], ['opp', 'Somebody took my egg. It needed to be warm.'], ['you', 'Then fight me and warm up. Then we go and get it.']],
    swamp: [['opp', 'Smells like a bog. Oh. It\'s you.'], ['you', 'Your lava dries out my mud every time you walk past.'], ['opp', 'Somebody took my egg. Your frog too, I hear.'], ['you', 'Then we both climb. You first: into my bog.']],
  });
  Object.assign(S.SOV_YOU, {
    air: 'All that gold. Bet you can\'t fly.', water: 'The tide reaches the top shelf too, Sovereign.', earth: 'Gold is just pretty rock. I know rock.', flame: 'Gold melts, Sovereign.',
    blood: 'Your heart\'s beating very fast for a king.', lava: 'Gold melts lower than I do.', storm: 'Gold conducts. Beautifully.', blast: 'Nice pedestal. Shame about it.',
    metal: 'Gold\'s a metal, Sovereign. So you\'re mine.', spirit: 'Your crown has a ghost in it. It wants out.', swamp: 'All that shine. The bog will dull it.',
  });
  Object.assign(S.PROTO_YOU, {
    air: 'My kite! Give it back. It\'s not a toy. Well, it is. But it\'s MY toy.', water: 'That\'s my water. The only real water on this shelf. Put it down.', earth: 'That pebble is from OUTSIDE. You don\'t even know what outside is.',
    flame: 'My candle. You let it go out. That was a mistake.', blood: 'My moon. And you never felt me take hold of you.', lava: 'My egg. It\'s cold. You let it get cold.',
    storm: 'That\'s my battery. Want to know what it does?', blast: 'You\'ve been playing with my snaps. Did you find the one that isn\'t harmless?', metal: 'My magnet. It\'s been pulling me up here all along.',
    spirit: 'My lantern. The lost ones followed it to you. Look behind you.', swamp: 'My frog! What have you done to his jar?',
  });
  Object.assign(S.NORMAL, {
    air: [['you', 'The very top. The wind\'s good up here.'], ['you', 'No kite, though.'], ['nar', 'Wren sits on the edge of the top shelf all night. In the Case, something grey winds a silver thread round its finger.']],
    water: [['you', 'The top shelf. Dry as dust.'], ['you', 'No water.'], ['nar', 'Nerys keeps watch until morning. In the Case, a single drop of water rolls round the bottom of a tiny flask.']],
    earth: [['you', 'Highest point on the shelf. Good footing.'], ['you', 'Empty hand, though.'], ['nar', 'Bram stands there all night, fist closed on nothing. In the Case, something grey turns a pebble over and over.']],
    flame: [['you', 'The top. And it\'s still dark.'], ['nar', 'Kael lights his palm and holds it up. It isn\'t the same.'], ['nar', 'In the Case, a candle stub sits unlit, waiting.']],
    blood: [['you', 'The top. No moon.'], ['nar', 'Morwen looks up at the window. The real moon is behind cloud.'], ['nar', 'In the Case, a crescent on a chain catches no light at all.']],
    lava: [['you', 'Top shelf. Cold up here.'], ['nar', 'Vulka glows all night to keep the shelf warm.'], ['nar', 'In the Case, an obsidian egg sits dark and cold.']],
    storm: [['you', 'Top of the shelf. Good place for a lightning rod.'], ['nar', 'Ilsa\'s eyes stay lit all night. Angry.'], ['nar', 'In the Case, a coin battery hums against the glass.']],
    blast: [['you', 'The top. Nothing left to knock down.'], ['nar', 'Rook sits with the empty tin in his lap.'], ['nar', 'In the Case, something grey pulls a snap. It doesn\'t go off. Not yet.']],
    metal: [['you', 'The top. And the pull\'s stronger.'], ['nar', 'Varga stands all night with his hand out, feeling north.'], ['nar', 'In the Case, a horseshoe magnet points straight at him.']],
    spirit: [['you', 'The top. The lost ones can\'t see me up here.'], ['nar', 'Ama holds up an empty hand like it\'s a lantern.'], ['nar', 'In the Case, a paper lantern flickers, though no one lit it.']],
    swamp: [['you', 'The top shelf. No mud. No frog.'], ['nar', 'Fen sits and talks to nobody all night.'], ['nar', 'In the Case, a little jar of moss sits beside the glass, and the painted frog seems to be listening.']],
  });
  Object.assign(S.TRUE, {
    air: [['you', 'My kite!'], ['nar', 'Wren ties the silver thread to her wrist and steps off the top shelf.'], ['nar', 'The draught from the window catches the kite, and her with it.'], ['you', 'Higher!']],
    water: [['you', 'My water!'], ['nar', 'Nerys uncorks the flask, and the drop of real water rises and spins between her hands.'], ['nar', 'Every bit of bending on the shelf feels a little more real.'], ['you', 'There. That\'s better.']],
    earth: [['you', 'There you are.'], ['nar', 'Bram closes his fist on the pebble from outside.'], ['nar', 'The whole shelf goes very still, like the ground under it remembered something.'], ['you', 'Good. Now nobody move.']],
    flame: [['you', 'My candle.'], ['nar', 'Kael touches a finger to the wick, and the top shelf lights up warm and gold.'], ['nar', 'Down the shelves, every figure turns to look at the light.'], ['you', 'Nobody gets left in the dark.']],
    blood: [['you', 'My moon.'], ['nar', 'Morwen fastens the crescent at her throat. Outside the window, the clouds part.'], ['nar', 'Every figure on the shelf feels the moon tug, gently, at their strings.'], ['you', 'Sleep well, everyone.']],
    lava: [['you', 'My egg. Cold.'], ['nar', 'Vulka holds it to her chest until it glows orange again.'], ['nar', 'Something inside it taps, twice.'], ['you', '...Huh.']],
    storm: [['you', 'My battery.'], ['nar', 'Ilsa snaps it back in. Her eyes flash, and every light on the shelf flickers on.'], ['nar', 'Somewhere outside, thunder rolls, right on cue.'], ['you', 'Now THAT\'s a storm.']],
    blast: [['you', 'My snaps!'], ['nar', 'Rook counts them back into the tin. All there. Even the one that isn\'t harmless.'], ['nar', 'He throws one at the floor, and it pops, and the whole shelf cheers.'], ['you', 'Party\'s back on.']],
    metal: [['you', 'North.'], ['nar', 'Varga lifts the horseshoe magnet, and every loose pin and screw on the shelf leaps to it.'], ['nar', 'It points the way home. He follows it down.'], ['you', 'Everyone together. Let\'s go.']],
    spirit: [['you', 'My lantern.'], ['nar', 'Ama lights it, and the lost ones come drifting up the shelves, one by one, toward the light.'], ['nar', 'She walks them all home.'], ['you', 'This way. Follow me.']],
    swamp: [['you', 'Hello, little one.'], ['nar', 'Fen unscrews the jar. The painted frog doesn\'t move. Of course it doesn\'t.'], ['nar', 'But something croaks, very softly, from the moss.'], ['you', 'I knew it. I KNEW it.']],
  });
})();
