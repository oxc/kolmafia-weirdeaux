import {Creation, parseCreation} from "../creation";
import {numberMatch} from "../util";
import * as console from "libram/dist/console"
import {MacroAction as RawMacroAction, parseFightHtml} from "./htmlParser";
import {advCost, getPlayerName, myName} from "kolmafia";

function parseNumber(text: string) {
  return Number(text.replace('.', ''));
}

export function parseFightResult(initialText: string, macroText: string) {
  const text = (initialText + macroText).replace(/<[^!][^<>]+>/g, '');


  const result = {
    damage: 0,
    stats: {
      total: 0,
      muscle: 0,
      mysticality: 0,
      moxie: 0,
    },
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

  return result;
}



interface Result {

}

class Fight {

  monname?: string = undefined;

  round: number = 0;
  over: boolean = false;
  won: boolean = false;
  advantage: boolean = false;

  damage = new Damage()
  familiarDamage = new Damage()

  gain = null

  firstResult: Result;

  lastMessage?: string;

  constructor(initialText: string) {
    this.firstResult = this.parseFight(initialText, true)
  }

  get totalDdamage(): Damage {
    return this.damage.plus(this.familiarDamage);
  }

  parseFight(text: string, logMonsterName = false): Result {
    const { rounds, afterFightMessage } = parseFightHtml(text);

    return {};
  }
}

interface UseAction {
  action: 'use',
  item1: Item,
  item2?: Item
}
interface SkillAction {
  action: 'skill',
  skill: Skill
}
type MacroAction = UseAction | SkillAction | {
  action: 'steal' | 'attack' | 'runaway'
}

export function getMacroAction(raw: RawMacroAction): MacroAction | undefined {
  const {action, first, second} = raw;
  switch (action) {
    case 'use': {
      if (!first) {
        console.error("Item action without items??");
        return undefined;
      }
      const item1 = Item.get(first!);
      if (second && second !== '0') {
        const item2 = Item.get(second);
        return {action, item1, item2};
      }
      return {action, item1};
    }
    case 'skill': {
      if (!first) {
        console.error('Skill action without skill??');
        return undefined;
      }
      const skill = Skill.get(first);
      return {action, skill};
    }
    case 'attack':
    case 'steal':
    case 'runaway':
      return {action};
    default:
      console.error(`Unknown macro action: ${action}`)
  }
}

export function getMacroLogString(action: MacroAction | undefined): string {
  switch (action?.action) {
    case 'attack': return `${myName()} attacks`;
    case 'skill': return `${myName()} casts ${action.skill.name.toUpperCase()}`;
    case 'use': return `${myName()} uses ${action.item1.name}${action.item2 ? ` and ${action.item2.name}` : ''}`;
    case 'steal': return `${myName()} tried to Pickpocket`
    case 'runaway': return `${myName()} tried to run away`
    default: return `${myName()} did ... SOMETHING?`
  }
}

class Damage {
  public physical = 0;
  public cold = 0;
  public hot = 0;
  public sleaze = 0;
  public spooky = 0;
  public stench = 0;

  constructor(damage?: number | Damage) {
    if (damage !== undefined) {
      this.add(damage);
    }
  }

  add(value: Damage | number): void {
    if (typeof value === 'number') {
      this.physical += value;
    } else {
      this.physical += value.physical;
      this.hot += value.hot;
      this.cold += value.cold;
      this.stench += value.stench;
      this.spooky += value.spooky;
      this.sleaze += value.sleaze;
    }
  }

  plus(value: Damage | number): Damage {
    const result = new Damage(this);
    result.add(value);
    return result;
  }

  valueOf(): number {
    return this.physical + this.hot + this.cold + this.stench + this.spooky + this.sleaze;
  }

  getLogString(summarize = false): string {
    return JSON.stringify(this);
    /*
    const elemental_damage = [(element, getattr(this. element)) for element in elements if getattr(this. element) > 0 ]
    if (!this.physical && elemental_damage.length == 1) {
      element, damage = elemental_damage[0]
      return "{{color:%s:bold}}%d{{color:reset}}" % (elemental_colors[element], damage)
    }
    return "%d%s%s" % (this.physical,
      [" ({{color:%s:bold}}+%d{{color:reset}})" %
      (elemental_colors[element], damage)
    for element, damage in elemental_damage),
    ' = %d' % self if summarize && self > this.physical else '',
     */
  }
}