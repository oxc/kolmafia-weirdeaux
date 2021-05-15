import {Creation, parseCreation} from "./creation";
import {numberMatch} from "./util";
import {print} from "kolmafia";

function parseNumber(text: string) {
  return Number(text.replace('.', ''));
}

export function parseFightResult(initialText: string, macroText: string) {
  const creation = parseCreation(initialText);
  const text = (initialText + macroText).replace(/<[^<>]+>/g, '');

  const result = {
    creation,
    damage: 0,
    stats: {
      total: 0,
      muscle: 0,
      mysticality: 0,
      moxie: 0,
    },
    analytics: {
      damageByHpFactor: NaN,
      damageByHpFactorByParts: NaN,
      statsByAttackFactor: NaN,
      statsByAttackFactorByParts: NaN,
      expectedDamage: NaN,
      expectedStats: NaN,
      errorDamage: NaN,
      errorStats: NaN,
    }
  }


  const reDamage = /([\d+.]+)\s+damage/g;
  let amount: number | undefined;
  while (amount = numberMatch(reDamage, text)) {
    result.damage += amount;
  }

  const reStats = /([\d+.]+)\s+(?:(Beefiness|Fortitude|Muscleboundness|Strengthliness|Strongness)|(Enchantedness|Magicalness|Mysteriousness|Wizardliness)|(Cheek|Chutzpah|Roguishness|Sarcasm|Smarm))/g;
  let match;
  while (match = reStats.exec(text)) {
    const stats = parseInt(match[1]);
    result.stats.total += stats;
    if (match[2]) result.stats.muscle += stats;
    if (match[3]) result.stats.mysticality += stats;
    if (match[4]) result.stats.moxie += stats;
  }

  const damageByHpFactor = result.damage / creation.hpFactor;
  const damageByHpFactorByParts = result.damage / creation.hpFactor / creation.totalParts;
  const statsByAttackFactor = result.stats.total / creation.attackFactor;
  const statsByAttackFactorByParts = result.stats.total / creation.attackFactor / creation.totalParts;
  const expectedDamage = 80 * creation.hpFactor * creation.totalParts;
  const expectedStats = 20.5 * creation.attackFactor * creation.totalParts;
  const errorDamage = (expectedDamage - result.damage) / result.damage;
  const errorStats = (expectedStats - result.stats.total) / result.stats.total;

  result.analytics = {
    damageByHpFactor,
    damageByHpFactorByParts,
    statsByAttackFactor,
    statsByAttackFactorByParts,
    expectedDamage,
    expectedStats,
    errorDamage,
    errorStats
  };

  return result;
}