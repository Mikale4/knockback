/* ============================================================================
   realm_story.js -- THE TOP SHELF for the KNIGHTS OF THE REALM newcomers, and
   the BASKETBALL player (story.js explains a scene).
   ========================================================================== */
(function () {
  'use strict';
  const S = Story;
  Object.assign(S.RIVAL, { templar: 'crusader', crusader: 'templar', lancer: 'knight', basketball: 'skater' });

  Object.assign(S.TAUNT, {
    templar: ["Not unto us. But this one is unto you.", "I took a vow of poverty. You're about to take a vow of silence.", "The sword is long. The sermon is short."],
    crusader: ["DEUS VULT!", "My flail doesn't care how good your shield is.", "I've walked a long way to get here. You're in the way."],
    lancer: ["Lower your visor. The lists are open.", "Bramble's never lost a tilt. Neither have I.", "A courtesy before we begin: duck."],
    basketball: ["Check ball.", "You're gonna want to stretch first. Trust me.", "I'm about to put you on a poster."],
  });
  Object.assign(S.REPLY, {
    templar: ["The Temple keeps what it is given. And takes back what was taken.", "Brother, you will find me patient. Until I'm not.", "Then let us be brief."],
    crusader: ["Onward. Always onward.", "Pray, then fight. I've done my praying.", "The road goes through you."],
    lancer: ["En avant, Bramble!", "A clean hit, a broken lance, and a bow. That's a joust.", "I'll see you at the end of the run."],
    basketball: ["Shoot your shot.", "Take the over. Always take the over.", "Game time."],
  });
  Object.assign(S.WIN, {
    templar: ["Rise, if you can. Go in peace, if you can't.", "The vow holds.", "You fought well. The Temple fights better."],
    crusader: ["Another league walked.", "Deus vult. It willed that.", "Up you get. The road's long and I'll need company."],
    lancer: ["A fair tilt! Well ridden.", "Good boy, Bramble. Good boy.", "Three passes, three hits. Scored and won."],
    basketball: ["Nothing but net.", "Count it.", "Get that outta here!"],
  });
  Object.assign(S.INTRO, {
    templar: ["Brother Aldric came in his box with a reliquary: small, gold, sealed. He has guarded it for the whole of his short plastic life without once opening it.", "This morning, it was gone. Somewhere above, someone is holding the Temple's secret. He'll have it back."],
    crusader: ["Every crusader carries a pilgrim's badge. Mine was a little tin scallop shell, pinned to my surcoat when they sealed the box.", "Now there's a pin and no shell. I've walked further for less. Up the shelves it is."],
    lancer: ["Before every joust a knight takes a favour, a ribbon, to tie to the lance. Mine came in the box: green and gold, on Bramble's bridle.", "The ribbon's gone. Bramble's been in a sulk all morning. We ride to find it."],
    basketball: ["My set came with a hoop. Rim, net, backboard, the whole thing. Unboxed this morning and there's just a pole.", "No hoop, no game. Somebody up there's been shooting on MY rim. Let's go get it back."],
  });
  Object.assign(S.RIVAL_SCENE, {
    templar: [['opp', "A Templar! White and red and very serious. Have you seen a little tin shell, brother?"], ['you', "I have seen no shell, crusader. I am looking for something far more precious."], ['opp', "More precious than my pilgrim's badge? Name it."], ['you', "I will not. Draw your flail, and perhaps I'll tell you after."]],
    crusader: [['opp', "Sir Godric. You walk a long road with a lot of noise."], ['you', "And you guard a box you've never opened, Brother. What's in it?"], ['opp', "Faith. And now it is gone, taken by the grey thing that took your shell, I'd wager."], ['you', "Then let's see whose faith climbs faster."]],
    lancer: [['opp', "A knight on horseback, on a SHELF? Dismount at once, madam, this is no tourney."], ['you', "Sir Brackett! Every shelf is a tourney if you ride it properly. Lower your visor!"], ['opp', "I have no lance and no wish to be skewered."], ['you', "Then you'll be skewered unwillingly. Have at you!"]],
    basketball: [['opp', "Bro. Is that a basketball? On my halfpipe?"], ['you', "Your halfpipe's on my court, Kai. Seen a hoop go by?"], ['opp', "A grey thing rolled past with one on its head like a crown. Thought it was a costume."], ['you', "That's my RIM. Game to eleven, loser points the way."]],
  });
  Object.assign(S.SOV_YOU, {
    templar: "All that gold, and none of it given away. The Temple disapproves.",
    crusader: "A golden fortress at the end of the road. Every road has one.",
    lancer: "A golden champion! The final tilt. Lower your visor, Sovereign.",
    basketball: "You're blocking the lane, big guy. And I'm going baseline.",
  });
  Object.assign(S.PROTO_YOU, {
    templar: "You opened the reliquary. Brother. You OPENED it.",
    crusader: "That's my scallop shell pinned on your chest. You've not walked a single league for it.",
    lancer: "My favour! Tied round your arm like a bandage. Bramble, CHARGE.",
    basketball: "That's my hoop. You're WEARING my hoop.",
  });
  Object.assign(S.NORMAL, {
    templar: [['you', "The top of the shelf. Higher than any temple."], ['you', "And still, the reliquary is missing."], ['nar', "Brother Aldric keeps vigil all night. In the Case, something grey sits with a small open box in its lap, reading a scrap of paper over and over."]],
    crusader: [['you', "The end of the road. Or the top of it."], ['you', "No shell. A pilgrim with no badge is just a man who walked a long way."], ['nar', "Godric sleeps in his mail on the top shelf. Below, a tin scallop shell glints on a grey chest."]],
    lancer: [['you', "Victory! The lists are ours, Bramble!"], ['you', "...No favour, though. A knight should ride with a favour."], ['nar', "Rosalind brushes Bramble down until dawn. In the Case, a green and gold ribbon flutters on a grey arm."]],
    basketball: [['you', "Top of the shelf. Undefeated."], ['you', "But you can't dunk on a pole. Nobody can dunk on a pole."], ['nar', "Marcus dribbles until sunrise. Under the Case, something grey practises free throws into a stolen rim."]],
  });
  Object.assign(S.TRUE, {
    templar: [['you', "The reliquary. Opened."], ['nar', "Inside, on a scrap of folded paper in a child's handwriting: BE KIND TO EVERYONE ON THE SHELF."], ['you', "...So that was the secret. All along."], ['nar', "Brother Aldric folds the note away, and for the first time, takes off his helm."]],
    crusader: [['you', "My shell! The road's not over until you've got your shell."], ['nar', "Godric pins the little tin scallop back on his surcoat, polishes it with his thumb, and looks down at all the shelves he climbed."], ['you', "Long way down. Good walk."], ['nar', "He sets off at once, to walk it back."]],
    lancer: [['you', "My favour! Green and gold, still good as new!"], ['nar', "Rosalind ties the ribbon to Bramble's bridle. The horse, toy or not, tosses his head and stamps."], ['you', "One victory lap, Bramble. Then breakfast."], ['nar', "They thunder the length of the top shelf, the ribbon streaming out behind."]],
    basketball: [['you', "There it is. Rim, net, backboard. Home court."], ['nar', "Marcus bolts the hoop to the top of the shelf, steps back to the window, and lets one fly from the far side of the room."], ['you', "...Nothing but net."], ['nar', "PROTO-0 rebounds it and passes it back. Two on nothing until dawn."]],
  });
})();
