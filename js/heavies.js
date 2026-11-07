/* heavies.js -- HEAVY AUTO COMBOS, for the brawlers it suits.

   A tap of Heavy is the KNOCK, as ever. Press Heavy again before it lands and it becomes an auto combo instead: the
   first hit only staggers, and on a hit each one runs into the next by itself, ending in a stronger KNOCK. A Heavy
   names its follow-up with `auto` (fighter.js: autoArm, set by that second press, turns the opener's KNOCK into a
   stagger; cancels() runs the chain). Holding Heavy to charge it gives one hit of armour, for every figure. */
(function () {
  'use strict';
  const { mv, MOVES: M } = KB;
  const chain = (heavy, two, three) => { M[heavy].auto = two[0]; mv(two[0], Object.assign({ su: 0.09, ac: 0.07, rc: 0.22, dmg: 34, kb: [3, 0], stun: 0.5, reach: 1.25, rad: 0.95, lunge: 4, sfx: 'heavy', trail: 0 }, two[1], { auto: three[0] }));
    mv(three[0], Object.assign({ su: 0.13, ac: 0.08, rc: 0.32, dmg: 58, kb: [18, 6], launch: 1, finisher: 1, reach: 1.3, rad: 1.0, lunge: 4, sfx: 'heavy', trail: 0 }, three[1])); };

  chain('thunderPalm', ['auMon2', { name: 'Twin Dragons', pose: 'palm' }], ['auMon3', { name: 'Thunderclap', pose: 'dragonPalm', kb: [18, 6] }]);          // MONK: palm, both palms, a thunderclap
  chain('shieldRam', ['auVik2', { name: 'Axe Chop', pose: 'hack' }], ['auVik3', { name: 'Skull Splitter', pose: 'skullSplit', kb: [17, 7] }]);              // VIKING: shield, axe, the skull
  chain('shieldBash', ['auKni2', { name: 'Pommel Strike', pose: 'pommel' }], ['auKni3', { name: 'Overhand Cut', pose: 'twoHandOver', twoHand: 1 }]);      // KNIGHT: shield, pommel, a two-handed cut
  chain('powerHook', ['auBox2', { name: 'One-Two', pose: 'punch', su: 0.07 }], ['auBox3', { name: 'Liver Shot', pose: 'hook', kb: [17, 5] }]);            // BOXER: the hook, a one-two, the liver
  chain('spearTackle', ['auWre2', { name: 'Knife-Edge Chop', pose: 'chop' }], ['auWre3', { name: 'Clothesline', pose: 'lariat', kb: [18, 7] }]);          // WRESTLER: the spear, a chop, the clothesline
  chain('kettleSwing', ['auWei2', { name: 'Kettlebell Return', pose: 'kettle' }], ['auWei3', { name: 'Overhead Slam', pose: 'overhead', kb: [17, 7] }]); // WEIGHTLIFTER: swing, swing back, overhead
  chain('gunbaiBash', ['auSho2', { name: 'Tachi Cut', pose: 'slashA' }], ['auSho3', { name: 'Gunbai Sweep', pose: 'bash', kb: [19, 5] }]);               // SHOGUN: the fan, the sword, the fan again
  chain('heaterCharge', ['auCru2', { name: 'Flail Swing', pose: 'overhead' }], ['auCru3', { name: 'Shield Crush', pose: 'bash' }]);                        // CRUSADER: shield, flail, shield
  chain('kalkanCharge', ['auRed2', { name: 'Kilij Draw', pose: 'slashB' }], ['auRed3', { name: 'Kalkan Smash', pose: 'bash' }]);                           // REDBEARD: the kalkan, the kilij, the kalkan
  chain('seaHaymaker', ['auSai2', { name: 'Bar-Room Jab', pose: 'jabL', su: 0.07 }], ['auSai3', { name: 'Knockout Swing', pose: 'hookL', kb: [18, 6] }]); // SAILOR: a haymaker, a jab, the knockout
})();
