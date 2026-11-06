/* ============================================================================
   sports_story.js -- THE TOP SHELF for the MODERN SPORTS figures (story.js
   explains a scene). They came out of their boxes this week, a birthday
   present; the shelf has rules they don't know yet. Every one of them is
   missing something from the box, and PROTO-0 has it.
   ========================================================================== */
(function () {
  'use strict';
  const S = Story;
  Object.assign(S.RIVAL, { wrestler: 'boxer', boxer: 'wrestler', baseball: 'archer', archer: 'baseball', football: 'soccer', soccer: 'football',
    fencer: 'weightlifter', weightlifter: 'fencer', bowler: 'skater', skater: 'bowler' });

  Object.assign(S.TAUNT, {
    wrestler: ["¡Bienvenidos! Welcome to the main event!", "You and me. One fall. No disqualifications.", "The crowd wants a slam. Let's give them one."],
    baseball: ["Batter up. You're the ball.", "Three strikes and you're out. You get one.", "I've hit bigger things than you over the fence."],
    football: ["Hut! Hut! HIKE!", "You're on the wrong side of the line of scrimmage, pal.", "I'm the whole defence. Try and run past me."],
    soccer: ["You want the ball? Come and take it.", "Nutmeg incoming. Watch your legs.", "Ninety minutes? I only need nine seconds."],
    boxer: ["Gloves up, kid. This one's for the title.", "Float like a feather? I hit like a brick.", "Ding ding. Round one."],
    fencer: ["En garde. Do try to keep up.", "One touch. That is all I need.", "Your guard is open in four places. I counted."],
    weightlifter: ["I warm up with figures your size.", "Chalk's on. Let's lift.", "You're light. That's going to be a problem for you."],
    bowler: ["Step up to the lane, friend. You're the pins.", "I haven't missed a spare since the Tuesday league.", "Ten pins. You're number one."],
    archer: ["Hold still. Holding still is the polite thing to do.", "I can hit a cereal loop from across the room.", "Breathe, draw, release. You're the target."],
    skater: ["Yo! Nice shelf. I'm gonna grind it.", "Watch this, watch this. Okay, now watch THIS.", "You're kinda in my line, dude."],
  });
  Object.assign(S.REPLY, {
    wrestler: ["The Masked Thunder fears no one! ¡Vámonos!", "My partner would have loved this fight.", "From the top rope, then!"],
    baseball: ["Step into the box. I'll take the first pitch.", "Swing and a hit. Watch.", "I play nine innings. You won't last two."],
    football: ["Out of my way. I've got a play to find.", "I'll go through you. I go through everyone.", "Fourth and one. I'm going for it."],
    soccer: ["Ball's mine. It's always mine.", "Mind the boots. One of them's golden.", "Keep up, if you can keep up."],
    boxer: ["Pops always said: jab first, ask questions later.", "I've been hit by better. Come on.", "Let's dance."],
    fencer: ["Touché comes before you see it.", "Your stance is a letter of apology.", "Mind the point."],
    weightlifter: ["One plate short of a record. You'll do as a plate.", "Step on the platform. Let's see your form.", "Light weight."],
    bowler: ["One more frame. Then I'm going up.", "You're standing like a seven-ten split.", "Rolling!"],
    archer: ["I'm aiming for the top shelf. You're in the way.", "Hold still. It's quicker.", "Nock, draw, loose."],
    skater: ["Sick. Okay. Let's go.", "Bet I can ollie you.", "Three wheels and I'm still faster than you."],
  });
  Object.assign(S.WIN, {
    wrestler: ["¡LUCHA! The crowd goes wild!", "One, two, three. That's the count.", "You fought with honour. Now rest, amigo."],
    baseball: ["That one's going, going, gone.", "Strike three.", "Good game. Well, good game for me."],
    football: ["Touchdown. Spike it.", "Flag on the play? Nope. Clean hit.", "That's how you run it up the middle."],
    soccer: ["GOOOOAL!", "Nutmegged. Every time.", "Ball's still mine."],
    boxer: ["Stay down. You're done.", "That's the title, kid.", "Pops would've rung the bell for that one."],
    fencer: ["Touché.", "I did warn you about the point.", "A pleasure. A short one."],
    weightlifter: ["Good lift.", "Easy. Next.", "You were lighter than you looked."],
    bowler: ["Strike! Mark it down.", "Right in the pocket.", "Clean sweep, friend."],
    archer: ["Bullseye.", "I didn't even have to aim.", "Next target."],
    skater: ["Landed it! Did you see? I landed it!", "Totally rad. Totally.", "Don't worry, the floor caught you."],
  });

  Object.assign(S.INTRO, {
    wrestler: ["The box said TAG TEAM SET. When I came out of it this morning, I was alone. My partner, El Relámpago, was not in the box.", "A luchador does not climb alone. But today, for my partner, I will. To the top of the shelf!"],
    baseball: ["Unboxed this morning, and already my lucky ball is gone. Signed by me, for me. Smacked it once, and it flew up into the dark.", "Somewhere up those shelves is my home-run ball. I'm going to go get it, one at-bat at a time."],
    football: ["My playbook came in the box with me. Every play I ever needed. It was gone before I'd even got my helmet on.", "No playbook means I make it up as I go. So: straight up the middle. Every shelf. Every time."],
    soccer: ["The Golden Boot comes as a pair. Two gold boots. I came out of the box with one gold and one... ordinary.", "I'll win with one. But I'd like the other one back. Let's play."],
    boxer: ["Pops came in the box with me. Little guy, my corner man. Rang the bell, held the towel. Pops is gone.", "No corner, no bell, no problem. I'll go the distance on my own, and find him on the way."],
    fencer: ["My medal. Gold, on a ribbon, around my neck when they sealed the box. When I opened my eyes: the ribbon, and nothing on it.", "Someone on this shelf took it. I will find them, and I will be very polite about it. Until I am not."],
    weightlifter: ["My set came with a bar and the plates for a world record. One plate is missing. One plate short of history.", "So I'll climb, and lift whatever's in my way, until I find that plate."],
    bowler: ["Ten pins came in my box. Nine came out. Never bowled a perfect game with nine pins, and I'm not about to start.", "The tenth pin's up there somewhere. Lenny Lanes always picks up the spare."],
    archer: ["My trophy came with a golden arrow, the one I won it with. The trophy's here. The arrow isn't.", "From the top of the shelf I can see the whole room. If the arrow's in it, I'll spot it."],
    skater: ["Unboxed today, dropped in, and a wheel flew straight off my board. Rolled away into the dark like it had somewhere to be.", "Three wheels is fine. Three wheels is a style. But I want my wheel back, so: up we go."],
  });

  Object.assign(S.RIVAL_SCENE, {
    wrestler: [['opp', "A wrestler. Tights, a mask, a cape. You lot are all theatre, kid."], ['you', "And you are all fists and no heart, boxer. I am looking for my partner."], ['opp', "Partner? I don't need a partner. I lost my corner man and I'm still standing."], ['you', "Then we have lost the same thing, you and I. Let us see who wants it back more!"], ['opp', "Gloves up."]],
    boxer: [['opp', "¡Hola, campeón! Another lonely fighter on the shelf. Where is your corner?"], ['you', "Gone. Pops is gone. And I don't need a masked clown to remind me."], ['opp', "My partner is gone too. A grey thing on the top shelf has been collecting us, I think."], ['you', "Then I'll get there first. No offence, Thunder."], ['opp', "None taken! ¡Pelea!"]],
    baseball: [['opp', "Your ball flew past my target this morning. Straight up, then something grey caught it. Didn't even blink."], ['you', "You saw it? Where? Which shelf?"], ['opp', "The top one. I'll tell you exactly where, if you can beat me to it."], ['you', "Archery against batting? Bring your best, Fletcher."]],
    archer: [['opp', "Fletcher! You're blocking my line of sight to the top shelf."], ['you', "And you're blocking mine, Callahan. My golden arrow went the same way as your ball."], ['opp', "Then it's a race. Loser stays on the shelf below."], ['you', "I never miss, Ace. You should know that before you swing."]],
    football: [['opp', "Football? You call THAT football? You barely use your feet!"], ['you', "Oh, here we go. It's football. It's always been football."], ['opp', "It's FOOTball. Feet. Ball. You carry it around in your arms like a sandwich."], ['you', "Okay. I've got a new play. It's called 'running you over'."], ['opp', "Kick-off, then."]],
    soccer: [['opp', "You. The guy with one golden boot. Get off my field."], ['you', "Your field? This is a pitch. And it's not yours."], ['opp', "Somebody walked off with my playbook. Grey fella. You know anything about that?"], ['you', "Grey fella? He's got my other boot! Okay. After I win, we find him together."]],
    fencer: [['opp', "A fencer. All flicks and footwork. Can you even lift your own sword?"], ['you', "Strength is a blunt instrument, Bruna. I prefer a point."], ['opp', "I'm one plate short of a record. You've got that look: someone who knows where things go missing."], ['you', "My medal went the same way. Up. To the top shelf. Fight me for the right to go first."]],
    weightlifter: [['opp', "Bruna. You will step aside, or I will make you step aside."], ['you', "Make me, Céleste. You weigh as much as one of my plates."], ['opp', "Which is exactly the plate you are missing, if I heard correctly."], ['you', "Ha! Fine. Winner climbs first, loser carries the bags."]],
    bowler: [['opp', "Yo, old-timer! You bowl at the alley? I skate the parking lot outside it."], ['you', "So you're the racket at midnight. Lenny Lanes. Ten-pin league champion."], ['opp', "My wheel rolled off into the dark this morning. You lose anything round here?"], ['you', "My tenth pin. Same dark. Probably the same thief. Let's see who's faster to the top."]],
    skater: [['opp', "The kid with three wheels. You'll take an eye out with that board."], ['you', "Lenny! Dude! I've seen your shoes. Respect."], ['opp', "Thanks, kid. Now get off my lane, before I bowl you over."], ['you', "Oh, you're on. Loser buys the other a wheel. Or a pin."]],
  });

  Object.assign(S.SOV_YOU, {
    wrestler: "A golden champion! Defend your title, Sovereign: the Masked Thunder challenges you!",
    baseball: "A gold one. Bet you'd fly a long way off a good swing.",
    football: "Something's behind you, big guy. And I'm going through you to get to it.",
    soccer: "Shiny. One of my boots is that colour. Step aside, please.",
    boxer: "A title fight. Finally. Ring the bell, Sovereign.",
    fencer: "A gilded guard. Impressive. Ineffective. En garde.",
    weightlifter: "You look heavy. Good. I need the practice.",
    bowler: "All that gold, and you're standing right where the head pin goes.",
    archer: "I can see the Case from here. You're right in front of the bullseye.",
    skater: "Whoa. Gold. Can I grind on you? Nah, I'm gonna grind THROUGH you.",
  });
  Object.assign(S.PROTO_YOU, {
    wrestler: "You. You have my partner! ¡Devuélvemelo!",
    baseball: "Grey, no paint, never blinks. Yeah, you caught my ball.",
    football: "Wait, are you reading my PLAYBOOK?",
    soccer: "Is that... my other boot on you? Take it OFF.",
    boxer: "Where's Pops? You've got a little guy with a bell somewhere in there. Give him back.",
    fencer: "A gold medal. On a ribbon. You are wearing it. Remove it, please.",
    weightlifter: "There's my plate. You're using it as a SHIELD.",
    bowler: "That's not a head. That's my tenth pin. You've got it on your SHOULDERS.",
    archer: "There's a golden arrow behind your ear. I'd like it back now.",
    skater: "Dude. Dude. Is that my WHEEL?",
  });
  Object.assign(S.NORMAL, {
    wrestler: [['you', "The championship of the shelf! ¡Campeón!"], ['you', "...But a tag team title needs two. The other half of my belt is still empty."], ['nar', "El Trueno poses for a crowd that is not there. Behind him, something grey is wearing a second mask."]],
    baseball: [['you', "Top of the shelf. Best view in the house."], ['you', "No ball, though. I'll find another. I always do."], ['nar', "Ace swings at the dark until morning. Under the Case, something grey tosses a ball from hand to hand."]],
    football: [['you', "Touchdown. Top shelf. Undefeated."], ['you', "Never needed the playbook anyway. Probably."], ['nar', "Tank does not know that somewhere beneath him, someone is reading his plays, one page at a time."]],
    soccer: [['you', "Champion! Of the shelf! With one golden boot!"], ['you', "Imagine what I'd have done with two."], ['nar', "Nico juggles until dawn. Below the Case, something grey wiggles its foot in a golden boot that doesn't fit."]],
    boxer: [['you', "Champ. Undisputed. On my own."], ['you', "...Nobody to ring the bell, though. Feels like the fight's not over."], ['nar', "Rocco shadowboxes into the night. Far beneath him, very faintly, a little bell rings once."]],
    fencer: [['you', "The top of the shelf. The bout is won."], ['you', "And yet I have nothing to show for it but a ribbon."], ['nar', "Céleste salutes the empty room. In the Case, something grey catches the light on a gold medal."]],
    weightlifter: [['you', "Top of the shelf. One plate short of a record."], ['you', "Still: that was a good lift."], ['nar', "Bruna waits all night for her plate. Under the Case, something grey uses it as a hat."]],
    bowler: [['you', "Two hundred and ninety-nine. Not bad for nine pins."], ['you', "One more and it'd be perfect. One more pin."], ['nar', "Lenny polishes his ball till sunrise. Under the Case, something grey wobbles like a pin."]],
    archer: [['you', "I can see the whole room from here. The rug, the window, the bed."], ['you', "No golden arrow. Not anywhere I can see."], ['nar', "Wren keeps watch all night. She never thinks to look down, beneath her own feet."]],
    skater: [['you', "TOP SHELF, BABY! First try! Well. Ninth try."], ['you', "Bet I could do it on four wheels, though."], ['nar', "Kai kickflips until morning. Below the Case, a single wheel rolls back and forth in the dark."]],
  });
  Object.assign(S.TRUE, {
    wrestler: [['you', "¡RELÁMPAGO! Mi hermano!"], ['nar', "A second masked figure, lightning on his chest, tumbles out of the grey wreckage and into a bear hug."], ['you', "The tag team is complete! Now we are TRULY champions!"], ['nar', "The Lightning and the Thunder hold the shelf together. Every night, a double dropkick. The crowd is the whole playroom."]],
    baseball: [['you', "My ball! Signed by me, for me. Still got the grass stain."], ['nar', "Ace tosses the ball once, twice, and hits it clean over every shelf in the room."], ['you', "That's the one. That's a home run."], ['nar', "The ball lands in the toy chest, where Captain Rook declares it treasure. Ace lets him keep it. He's got more swings in him."]],
    football: [['you', "My playbook! Every play I ever... huh. Somebody wrote a new page."], ['nar', "On the last page, in grey pencil, PROTO-0 has drawn a play: every figure on the shelf, running the same way, together."], ['you', "Okay. That's a pretty good play, actually."], ['nar', "Tank teaches it to the whole room. They call it THE SHELF. Nobody has ever stopped it."]],
    soccer: [['you', "My boot! My other golden boot! Both of them, together, finally!"], ['nar', "Nico laces up the pair and takes one shot. It curls around three shelves and lands in the Case."], ['you', "GOOOOAL! The Golden Boot, as a pair, the way it was meant to be!"], ['nar', "From then on, he plays every night. He lets Tank win sometimes. Not often."]],
    boxer: [['you', "Pops! There you are!"], ['nar', "A tiny figure in a cap clambers out of the grey dust, holding a bell and a towel, as if he'd never left."], ['you', "You were in there the whole time? Ring it, Pops. Ring the bell."], ['nar', "Ding ding. The fight's over. Rocco sits down in his corner for the first time all night."]],
    fencer: [['you', "My medal. On its ribbon. As it should be."], ['nar', "Céleste bows to the cracked grey figure, the full and formal salute of the piste."], ['you', "You fought well, PROTO-0. Ungracefully. But well."], ['nar', "She hangs the medal around her neck. It was, she admits later, the best bout of her life."]],
    weightlifter: [['you', "My plate! Bring me the bar!"], ['nar', "Bruna loads the last plate and lifts. The whole playroom holds its breath."], ['you', "WORLD RECORD!"], ['nar', "The bar comes down with a crash that wakes the cat. Nobody minds. It was a very good lift."]],
    bowler: [['you', "Number ten! There you are, you beautiful pin."], ['nar', "Lenny sets up all ten pins on the top shelf and rolls one ball down the length of it."], ['you', "STRIKE! Three hundred! A perfect game!"], ['nar', "He frames the score sheet. It hangs on the wall above the shelf to this day."]],
    archer: [['you', "My golden arrow. Not a scratch on it."], ['nar', "Wren nocks it, draws, and lets it fly across the whole room, through the ring of a dangling keychain."], ['you', "Bullseye. From the top shelf."], ['nar', "She leaves the arrow there, in the wall, where everyone can see it. Some shots deserve to stay."]],
    skater: [['you', "MY WHEEL! Oh, I missed you, little guy."], ['nar', "Kai snaps the wheel back on, drops in off the top shelf and rides the banister all the way to the floor."], ['you', "Four wheels! I'm UNSTOPPABLE!"], ['nar', "He is, in fact, stopped by the rug. He lands it anyway. Everyone agrees it counts."]],
  });
})();
