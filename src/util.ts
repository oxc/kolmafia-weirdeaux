import * as kolmafia from "kolmafia";
import {getProperty, haveEffect, haveEquipped} from "kolmafia";

export function abort(msg: string): never {
  kolmafia.abort(msg);
  throw new Error('This should never be reached');
}
export const Items = (...items: string[]): Item[] => items.map((i) => Item.get(i));
export const Effects = (...effects: string[]): Effect[] => effects.map((e) => Effect.get(e));
export const haveAnyEquipped = (...items: Item[]): boolean => items.some((i) => haveEquipped(i));
export const haveAnyEffect = (...effects: Effect[]): boolean => effects.some((i) => haveEffect(i));
export const timesRested = (): number => Number(getProperty('timesRested'));

export function numberMatch<T extends number = number>(regexp: RegExp, text: string): T | undefined {
  const match = regexp.exec(text);
  if (!match) return undefined;
  return parseInt(match[1]) as T;
}
