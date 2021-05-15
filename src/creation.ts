import {abort, numberMatch} from "./util";

const HEADS = <const> [
  'Tiger', 'Cobra', 'Gorilla', 'Goat', 'Pufferfish', 'Giraffe', 'Frog', 'Alligator', 'Naked Mole Rat', 'Jellyfish'
]
const BODY_PARTS = <const> [
  'Shark', 'Leopard', 'Bear', 'Bee', 'Snail', 'Cheetah', 'Hedgehog', 'Wolf', 'Elephant', 'UNKNOWN'
]
const BUTTS = <const> [
  'Rhinocerous', 'Spider', 'Fire Ant', 'Penguin', 'Skunk', 'Bat', 'Leech', 'Rattlesnake', 'Scorpion', 'Octopus'
]
export type Head = typeof HEADS[number];
export type BodyPart = typeof BODY_PARTS[number];
export type Butt = typeof BUTTS[number];

export interface Creation {
  head: Head,
  butt: Butt,
  body: Record<BodyPart, number>,
  totalParts: number,
  species: string,
  attackFactor: number,
  defenseFactor: number,
  hpFactor: number,
}

const _reHead = /\/an_head(\d+)\.gif/;
const _reButt = /\/an_butt(\d+)\.gif/;


function match<T extends string>(names: readonly T[], regexp: RegExp, text: string): T | undefined {
  const ix = numberMatch(regexp, text);
  if (ix === undefined) return undefined
  return names[ix - 1] as T;
}

export function parseCreation(response: string): Creation {
  const head = match(HEADS, _reHead, response);
  const butt = match(BUTTS, _reButt, response);
  if (!head || !butt) abort("What creature doesn't have a head and a butt??");
  let totalParts = 0;
  const parts: Record<BodyPart, number> = BODY_PARTS.reduce((acc: any,curr)=> (acc[curr]=0,acc),{});
  const creationSpecies: string[] = [head, butt];
  const _reBody = /\/an_seg(\d+)\.gif/g;
  let part: BodyPart | undefined;
  while (part = match(BODY_PARTS, _reBody, response)) {
    parts[part] += 1;
    totalParts += 1;
  }
  for (const part of BODY_PARTS) {
    const count = parts[part];
    if (count) {
      creationSpecies.push(`${count}${part}`)
    }
  }
  return {
    head, butt,
    body: parts,
    totalParts,
    species: creationSpecies.join('-'),
    attackFactor: Math.pow(1.2, parts['Shark']),
    defenseFactor: Math.pow(1.2, parts['Leopard']),
    hpFactor: Math.pow(1.2, parts['Bear']),
  }
}