/* ============================================================================
   edo_story.js -- THE TOP SHELF for the EDO JAPAN newcomers (story.js explains
   a scene). Each came out of the box missing something, and PROTO-0 has it.
   ========================================================================== */
(function () {
  'use strict';
  const S = Story;
  Object.assign(S.RIVAL, { ronin: 'shogun', shogun: 'ronin', kunoichi: 'daimyo', daimyo: 'kunoichi' });

  Object.assign(S.TAUNT, {
    ronin: ["I have no lord, no house, and no reason to lose.", "Draw, if you like. I already have.", "One cut. Then I'll find somewhere to sit."],
    kunoichi: ["You won't see me. You'll only see where I was.", "Hold still. The hairpin is very thin.", "A flower, a fan, a needle. Pick one."],
    shogun: ["Kneel. Everyone kneels, eventually.", "The musket line is behind me. It is always behind me.", "This shelf is now under my rule."],
    daimyo: ["You stand in my domain. Pay the levy.", "My castle has stood a hundred sieges. You are not a siege.", "The naginata is longer than your arm. Mind it."],
  });
  Object.assign(S.REPLY, {
    ronin: ["My lord is somewhere up there. I'll walk until I find him.", "Fine. I wasn't using this afternoon anyway.", "The sake's warm. The blade's cold. Begin."],
    kunoichi: ["A mission is a mission. Even on a shelf.", "You'll forget my face. Everyone does.", "Iris blooms, iris falls."],
    shogun: ["The realm will be united. Starting with this shelf.", "Bring them all. One at a time.", "My seal. Return it, or be stamped flat."],
    daimyo: ["My castle, my rules. Shall we begin?", "I've ruled since I was twelve. You don't frighten me.", "To the walls, then."],
  });
  Object.assign(S.WIN, {
    ronin: ["...Good fight. I'll drink to it.", "You cut well. I cut first.", "Masterless, but not without manners. Thank you."],
    kunoichi: ["You were fighting a log for half of that.", "Rest. The poison wears off. Mostly.", "Seen and gone."],
    shogun: ["As decreed.", "The line held. It always holds.", "Rise. You fought with honour. Then kneel again."],
    daimyo: ["Tribute received.", "The castle stands. As it always will.", "Return to your lands. Tell them who rules here."],
  });
  Object.assign(S.INTRO, {
    ronin: ["The box said RETAINER AND LORD. When it opened I was alone, and the little lord who stood beside me in the plastic was gone.", "A samurai without a lord is a ronin. A ronin can at least walk. Up, then."],
    kunoichi: ["My set came with a mission scroll, sealed with wax. I hadn't read it. Now I can't: someone took it while I was still in the tissue paper.", "A shinobi without her orders improvises. I'm good at that."],
    shogun: ["The seal of the shogunate came in my box. Gold, heavy, the only one. Without it no order I give is law.", "So I'll take back my seal the old way. Through every one of them."],
    daimyo: ["My set came with a castle. Three storeys, white walls, gold fish on the roof. I came out of the box. The castle didn't.", "Somewhere up those shelves, someone is living in my keep. I'd like to have a word."],
  });
  Object.assign(S.RIVAL_SCENE, {
    ronin: [['opp', "A ronin. Straw hat, empty belt, a gourd of sake. Kneel, masterless one."], ['you', "I kneel to one lord, Shogun. He's missing. You'll do as a step on the way."], ['opp', "Insolence. My seal is missing too, and I begin to think the grey thing took both."], ['you', "Then we climb the same way. After I cut you."]],
    shogun: [['opp', "You're the Shogun. I'd heard you were taller."], ['you', "And I heard ronin learned to hold their tongues. Step aside."], ['opp', "Can't. Your grey friend took my lord the same night it took your seal."], ['you', "Then prove you can still hold a blade, and I'll let you follow my banners."]],
    kunoichi: [['opp', "A figure in my keep's shadow. Show yourself, shinobi."], ['you', "You have good eyes, my lady. Most never see me at all."], ['opp', "My castle is gone and a spy turns up the same day. Explain."], ['you', "I lost my orders too. Whoever has your castle has my scroll."]],
    daimyo: [['opp', "The castle lord. Your walls are missing, my lady."], ['you', "And you're the one who walks through walls. Did you take them?"], ['opp', "If I'd taken a castle, I'd have taken the gold fish first. No. Something grey did."], ['you', "Then we'll settle this, and then we'll storm whatever it's living in."]],
  });
  Object.assign(S.SOV_YOU, {
    ronin: "Gold all over and nobody to serve. I know the feeling. Draw.",
    kunoichi: "So much gold. I'll be in and out before you notice you're missing a piece.",
    shogun: "A gilded usurper on my shelf. Abdicate.",
    daimyo: "The gate's yours, Sovereign? Not for long.",
  });
  Object.assign(S.PROTO_YOU, {
    ronin: "...My lord. You're carrying him on your back like a pack. Put him down. Gently.",
    kunoichi: "That's my scroll in your hand. Did you read it? You weren't supposed to read it.",
    shogun: "My seal. You've stamped it on yourself. Grey is not an imperial colour.",
    daimyo: "You're wearing my castle as a hat. TAKE IT OFF.",
  });
  Object.assign(S.NORMAL, {
    ronin: [['you', "The top of the shelf. A long walk."], ['you', "No lord up here either. Just the view."], ['nar', "Gennosuke drinks to the moon in the window. Far below, under the Case, a tiny painted lord taps on the glass."]],
    kunoichi: [['you', "Highest point in the room. Good for watching."], ['you', "Still no scroll. I'll write my own orders."], ['nar', "Ayame vanishes into the curtains. In the Case, something grey unrolls a scroll, reads it, and looks worried."]],
    shogun: [['you', "The shelf is united. Under me."], ['you', "...Without the seal, it doesn't count. It never counts."], ['nar', "Lord Ryūgen sits in state until dawn. Below, PROTO-0 stamps a gold seal on everything it owns."]],
    daimyo: [['you', "The summit. A fine place for a castle."], ['you', "If I had one."], ['nar', "Lady Sayo surveys the room she'd rule. Beneath her, in the Case, a tiny castle glows with a little grey light inside."]],
  });
  Object.assign(S.TRUE, {
    ronin: [['you', "My lord! Are you hurt?"], ['nar', "A small painted lord in a court cap climbs out of the grey wreck, straightens his hat, and bows to his retainer."], ['you', "...No, my lord. Not ronin. Not any more."], ['nar', "They walk the top shelf together until sunrise, the lord talking, Gennosuke listening."]],
    kunoichi: [['you', "My scroll. Still sealed. You didn't read it after all."], ['nar', "Ayame breaks the wax. The orders inside say, in tiny brush strokes: PROTECT THE SHELF."], ['you', "...Then I've already done it."], ['nar', "She tucks the scroll away and disappears, as if she'd never been there at all."]],
    shogun: [['you', "The seal of the shogunate. Back where it belongs."], ['nar', "Ryūgen stamps one decree on the shelf's edge: PEACE ON THE TOP SHELF. By order."], ['you', "And you, grey one: you're pardoned. Find a colour."], ['nar', "PROTO-0, a little gold-stamped, salutes."]],
    daimyo: [['you', "My castle! Three storeys, white walls, and both gold fish!"], ['nar', "Sayo sets the keep on the top shelf. Its little lanterns light up on their own."], ['you', "Well? Everyone in. There's room for my whole domain."], ['nar', "And there is."]],
  });
})();
