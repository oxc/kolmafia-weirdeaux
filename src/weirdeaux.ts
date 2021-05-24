import * as kolmafia from "kolmafia";
import {
  adv1,
  adventure,
  buy,
  cliExecute,
  getProperty,
  haveEffect,
  haveEquipped,
  itemAmount, mpCost,
  myAdventures,
  myClass,
  myHp, myLevel,
  myMaxhp,
  myMaxmp,
  myMp,
  print, printHtml, runCombat, setProperty,
  totalFreeRests, toUrl,
  use,
  useSkill, visitUrl
} from "kolmafia";
import {abort, Effects, haveAnyEffect, haveAnyEquipped, Items, timesRested} from "./util";
import {Butt, Head, parseCreation} from "./creation";
import {Macro} from "libram/dist/combat";

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
const utensilTwist = Skill.get('Utensil Twist');

// combat items
const greenSmokeBomb = Item.get('green smoke bomb');
const tatteredScrap = Item.get('tattered scrap of paper');

// curable effects
const aLittleBitPoisoned = Effect.get('A Little Bit Poisoned');
const beatenUp = Effect.get('Beaten up');

// healing items
const antiAntiAntidote = Item.get('anti-anti-antidote');
const scrollOfDrasticHealing = Item.get('scroll of drastic healing');

// MP restorers
const genericManaPotion = Item.get('generic mana potion');

const maxPrices = {
  [greenSmokeBomb.name]: 5000,
  [tatteredScrap.name]: 2222,
  [genericManaPotion.name]: 130,
  [scrollOfDrasticHealing.name]: 850,
}

export function generateWeirdeauxMacro(text: string): Macro {
  const creation = parseCreation(text);
  const interest = creation.attackFactor / creation.hpFactor;

  print(`You're fighting a ${creation.species}`, 'lavender');

  print(`Attack: ${creation.attackFactor.toFixed(2)}, HP: ${creation.hpFactor.toFixed(2)}, Defense: ${creation.defenseFactor.toFixed(2)}`);
  print(`Efficiency: ${interest.toFixed(2)}`);

  const macro = new Macro();
  macro.step('abort !monstername weirdeaux');
  const onceSkill = (skill: Skill) => Macro.while_(`hasskill ${skill}`, Macro.skill(skill));
  const ensureItems = (item: Item, item2?: Item) => Macro
    .item(item2 ? [item, item2] : item)
    .step('repeat match "The jellyfish interrupts"');
  const whileNotMatch = (match: string, contents: string | Macro) => Macro.while_(`!match "${match}"`, contents);

  if (creation.butt === 'Octopus') {
    // TODO: use divine favors? (Only if not frog!)
    if (creation.head !== 'Frog' && creation.head !== 'Jellyfish') {
      if (itemAmount(greenSmokeBomb) || itemAmount(tatteredScrap)) {
        const [stunner] = getStunners(1);
        macro.if_(`hascombatitem ${greenSmokeBomb} || hascombatitem ${tatteredScrap}`,
          Macro.item(stunner.item)
            .while_(`!match "${stunner.wearOff}" && hascombatitem ${greenSmokeBomb}`, Macro.item(greenSmokeBomb))
            .while_(`!match "${stunner.wearOff}" && hascombatitem ${tatteredScrap}`, Macro.item(tatteredScrap))
        )
      }
    }
    macro.step('runaway');
    return macro;
  }

  macro.step(onceSkill(marinara));

  // TODO: interleave more stuns when Jellyfish head

  if (myClass() === Class.get('Turtle Tamer')) {
    if (haveAnyEffect(...stormTortoiseBlessings)) {
      macro.step(onceSkill(shellUp));
      // only stuns if enemy did not miss/fumble
      macro.if_('match "bound by chains of arcing lightning"',
        whileNotMatch('shackles of lightning', Macro.skill(utensilTwist))
      );
    }
  }

  if (creation.head === 'Frog') {
    macro.step(
      onceSkill(Skill.get('Frost Bite')),
      whileNotMatch('thaws out', Macro.skill(utensilTwist)),
      onceSkill(Skill.get('Silent Squirt')),
    );

    // well, whatcha gonna do...
    macro.skill(utensilTwist).repeat();
    return macro;
  }

  const [stun1, stun2] = getStunners(2);

  if (creation.head === 'Jellyfish') {
    macro.step(ensureItems(stun1.item, stun2.item));
  } else {
    macro.step(ensureItems(stun1.item));
  }
  macro.step(whileNotMatch(stun1.wearOff, Macro.skill(utensilTwist)));
  macro.step(ensureItems(stun1.item));
  macro.step(whileNotMatch(stun1.wearOff, Macro.skill(utensilTwist)));


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

  const hpPer6GMP = 6*(2.5*myLevel())*(1000/mpCost(cannellonCocoon));
  print(`Can get ${hpPer6GMP} HP from 6 generic mana potions`)
  if (myMaxhp() - myHp() > hpPer6GMP) {
    cliExecute('hottub');
  }
  if (myMaxhp() - myHp() > hpPer6GMP) {
    use(scrollOfDrasticHealing);
  }

  const cocoons = Math.ceil(((myMaxhp() - 100) - myHp()) / 1000);
  const needMp = mpCost(cannellonCocoon) * cocoons;
  if (needMp > myMaxmp()) {
    abort('Need more MP than myMax to cast all cocoons at once.');
  }
  while (needMp > myMp()) {
    use(1, genericManaPotion);
  }
  useSkill(cocoons, cannellonCocoon);

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
      const got = buy(item, 2000, 300);
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

// @ts-ignore
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

  const target = myAdventures() - turns;
  let turnsPlayed = 0;
  while (myAdventures() > target) {
    print(`Request ${++turnsPlayed} of ${turns}`)
    ensurePrerequisites()
    heal();
    adv1(Mansion, -1, '');
    /*
    const initialText = visitUrl(toUrl(Mansion));
    const macroText = runCombat('creationCombatHandler') || weirdeauxRunCombat();
    const fightResult = parseFightResult(initialText, macroText);
    printHtml(`<pre>${JSON.stringify(fightResult, null, 2)}</pre>`);
     */
  }

  print('Done.');
}