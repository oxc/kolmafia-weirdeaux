import * as kolmafia from "kolmafia";
import {
  adv1,
  adventure,
  buy,
  cliExecute,
  getProperty,
  haveEffect,
  haveEquipped,
  itemAmount,
  myAdventures,
  myClass,
  myHp,
  myMaxhp,
  myMaxmp,
  myMp,
  print, printHtml, runCombat, setProperty,
  totalFreeRests, toUrl,
  use,
  useSkill, visitUrl
} from "kolmafia";
import {parseFightResult} from "./fightParser";
import {abort, Effects, haveAnyEffect, haveAnyEquipped, Items, timesRested} from "./util";
import {Butt, Head, parseCreation} from "./creation";

const { weirdeauxRunCombat } = require('./weirdeaux_run_combat.ash');

// must be sorted by order of effect
const stunners = [{
  item: Item.get('CSA obedience grenade'),
  wearOff: 'obedient reverie'
},{
  item: Item.get('brass abacus'),
  wearOff: 'stunning display of mathematical prowess',
},{
  item: Item.get('really nice net'),
  wearOff: 'finally struggles free of your net',
},{
  item: Item.get('glob of melted wax'),
  wearOff: 'finally breaks free from the coating of wax'
}
].map((s, i) => ({ ...s, order: i}));

function getStunners(count: number) {
  return stunners
    .map((s) => ({ ...s, amount: itemAmount(s.item) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, count)
    .sort((a, b) => a.order - b.order);
}

const stormTortoiseBlessings = Effects(
  'Blessing of the Storm Tortoise',
  'Grand Blessing of the Storm Tortoise',
  'Glorious Blessing of the Storm Tortoise'
);

// skills
const cannellonCocoon = Skill.get('Cannelloni Cocoon');
const tongueOfTheWalrus = Skill.get('Tongue of the Walrus');
const marinara = Skill.get('Curse of Marinara');
const shellUp = Skill.get('Shell Up');

// combat items
const greenSmokeBomb = Item.get('green smoke bomb');
const tatteredScrap = Item.get('tattered scrap of paper');

// curable effects
const aLittleBitPoisoned = Effect.get('A Little Bit Poisoned');
const beatenUp = Effect.get('Beaten up');

// healing items
const antiAntiAntidote = Item.get('anti-anti-antidote');

// MP restorers
const genericManaPotion = Item.get('generic mana potion');

const maxPrices = {
  [greenSmokeBomb.name]: 5000,
  [tatteredScrap.name]: 2222,
  [genericManaPotion.name]: 120,
}

export function generateWeirdeauxMacro(text: string): string {
  const creation = parseCreation(text);
  const interest = creation.attackFactor / creation.hpFactor;

  print(`You're fighting a ${creation.species}`, 'lavender');

  print(`Attack: ${creation.attackFactor.toFixed(2)}, HP: ${creation.hpFactor.toFixed(2)}, Defense: ${creation.defenseFactor.toFixed(2)}`);
  print(`Efficiency: ${interest.toFixed(2)}`);

  let macro = 'abort !monstername weirdeaux';
  const macroItem = (item: Item) => macro += `
    if hascombatitem ${item}
      use ${item}
    endif
  `;
  const macroOnceSkill = (skill: Skill) => macro += `
    while hasskill ${skill}
      skill ${skill}
    endif
  `;
  const macroItems = (item: Item, item2?: Item) => macro += `
    use ${item}${item2 ? `, ${item2}` : ''}
    while match "The jellyfish interrupts"
      use ${item}${item2 ? `, ${item2}` : ''}
    endwhile
  `;
  const macroWhileNotMatch = (match: string, action: string) => macro += `
    while !match "${match}"
      ${action}
    endwhile
  `

  if (creation.butt === 'Octopus') {
    // TODO: use divine favors? (Only if not frog!)
    if (creation.head !== 'Frog' && creation.head !== 'Jellyfish') {
      if (itemAmount(greenSmokeBomb) || itemAmount(tatteredScrap)) {
        const [stunner] = getStunners(1);
        macro += `
        if hascombatitem ${greenSmokeBomb} || hascombatitem ${tatteredScrap}
          use ${stunner.item}
          while !match "${stunner.wearOff}" && hascombatitem ${greenSmokeBomb}
            use ${greenSmokeBomb}
          endwhile
          while !match "${stunner.wearOff}" && hascombatitem ${tatteredScrap}
            use ${tatteredScrap}
          endwhile
        endif
      `
      }
    }
    macro += `
      runaway
    `
    return macro;
  }

  macroOnceSkill(marinara);

  // TODO: interleave more stuns when Jellyfish head

  if (myClass() === Class.get('Turtle Tamer')) {
    if (haveAnyEffect(...stormTortoiseBlessings)) {
      macroOnceSkill(shellUp);
      // only stuns if enemy did not miss/fumble
      macro += `
      if match "bound by chains of arcing lightning"
      `
      macroWhileNotMatch('shackles of lightning', 'skill utensil twist')
      macro += `
      endif
      `
    }
  }

  if (creation.head === 'Frog') {
    macroOnceSkill(Skill.get('Frost Bite'));
    macroWhileNotMatch('thaws out', 'skill utensil twist');
    macroOnceSkill(Skill.get('Silent Squirt'));
    // well, whatcha gonna do...
    macroWhileNotMatch('you slink', 'skill utensil twist');
    return macro;
  }

  const [stun1, stun2] = getStunners(2);

  macroItems(stun1.item, stun2.item);
  macroWhileNotMatch(stun1.wearOff, 'skill utensil twist')
  macroWhileNotMatch(stun2.wearOff, 'skill utensil twist')
  macroItems(stun1.item, stun2.item);
  macroWhileNotMatch(stun1.wearOff, 'skill utensil twist')
  macroWhileNotMatch(stun2.wearOff, 'use divine blowout, divine blowout')

  return macro;
}

export function heal(): void {
  if (haveEffect(beatenUp)) {
    if ((myMaxmp() - myMp() > 200) && (timesRested() < totalFreeRests())) {
      cliExecute('rest');
    } else {
      cliExecute('hottub');
    }
    if (haveEffect(beatenUp)) {
      useSkill(tongueOfTheWalrus);
    }
  }

  if (haveEffect(aLittleBitPoisoned)) {
    use(1, antiAntiAntidote);
  }

  useSkill(Math.ceil(((myMaxhp() - 100) - myHp()) / 1000), cannellonCocoon);

  while (myMp() < 200) {
    use(1, genericManaPotion);
  }
}

function ensurePrerequisites() {
  getStunners(2).forEach(({item, amount}) => {
    if (amount < 30) {
      abort(`Need more ${item}, have ${amount}`);
    }
  });
}

function checkOutfit() {
  if (!haveAnyEquipped(...Items('The Crown of Ed the Undying', 'Mesmereyes™ contact lenses'))) {
    abort('Need item that blocks first hit');
  }
  if (!haveEquipped(Item.get("Dinsey's pizza cutter"))) {
    abort("Need Dinsey's pizza cutter");
  }
}

function buyItems() {
  getStunners(stunners.length).forEach(({ item, amount }) => {
    if (amount < 5000) {
      const got = buy(item, 2000, 200);
      print(`Got ${got} ${item}`);
    }
  });
  for (const name in maxPrices) {
    const item = Item.get(name);
    const maxPrice = maxPrices[name];
    const got = buy(item, 1000, maxPrice);
    print(`Got ${got} ${item}`);
  }

}

const Mansion = Location.get('The Mansion of Dr. Weirdeaux');

export function creationCombatHandler(round: number, opp: Monster, text: string): string {
  const macro = generateWeirdeauxMacro(text);
  //printHtml(`creationCombatHandler returned: <pre>${action}</pre>`);
  return `"${macro}"`;
}

function setConsultScript() {
  setProperty("battleAction","custom combat script");
  setProperty("customCombatScript","weirdeaux.ccs");
}

export function main(turnsToAdventure = -1): void {
  setConsultScript();
  buyItems();
  checkOutfit();

  let turns = turnsToAdventure;
  if (turns < 0) turns = myAdventures()
  else if (turns > myAdventures()) turns = myAdventures();

  while (turns > 0) {
    ensurePrerequisites()
    heal();
    adv1(Mansion, -1, '');
    /*
    const initialText = visitUrl(toUrl(Mansion));
    const macroText = runCombat('creationCombatHandler') || weirdeauxRunCombat();
    const fightResult = parseFightResult(initialText, macroText);
    printHtml(`<pre>${JSON.stringify(fightResult, null, 2)}</pre>`);
     */

    if (haveEffect(beatenUp)) {
      abort('We should investigate this.');
    }

    turns -= 1;
  }

  print('Done.');
}