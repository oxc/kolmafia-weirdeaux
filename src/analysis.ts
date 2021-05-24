import {parseFightResult} from "./fightParser";
import {experienceBonus, haveEffect, print, printHtml} from "kolmafia";
import {parseCreation} from "./creation";
import {abort} from "./util";

export function analyzeFight(initialText: string, macroText: string) {
  const fight = parseFightResult(initialText, macroText);

  const creation = parseCreation(initialText);

  const damageByHpFactor = fight.damage / creation.hpFactor;
  const damageByHpFactorByParts = fight.damage / creation.hpFactor / creation.totalParts;
  const statsByAttackFactor = fight.stats.total / creation.attackFactor;
  const statsByAttackFactorByParts = fight.stats.total / creation.attackFactor / creation.totalParts;
  const expectedHp = 80 * creation.hpFactor * creation.totalParts;
  const expectedStats = 80/4 * creation.attackFactor * creation.totalParts;
  const errorHp = !fight.stats.total ? NaN : (expectedHp - fight.damage) / fight.damage;
  const errorStats = !fight.stats.total ? NaN : (expectedStats - fight.stats.total) / fight.stats.total;

  const analytics = {
    damageByHpFactor,
    damageByHpFactorByParts,
    statsByAttackFactor,
    statsByAttackFactorByParts,
    expectedHp,
    expectedStats,
    errorHp,
    errorStats
  };

  const result = {
    creation,
    fight,
    analytics,
  }
  printHtml(`<pre>${JSON.stringify(result, null, 2)}</pre>`);

  if (haveEffect(Effect.get('Beaten up'))) {
    if (creation.head === 'Frog' || creation.head === 'Jellyfish') {
      print(`So a ${creation.head} beat us up. Damn.`, 'orange');
    } else {
      abort('We should investigate this.');
    }
  }
}