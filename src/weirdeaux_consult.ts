import {generateWeirdeauxMacro} from "./weirdeaux";
import {printHtml, urlEncode, visitUrl} from "kolmafia";
import {parseFightResult} from "./fightParser";

export function main(round: number, opp: Monster, text: string): void {
  const macro = generateWeirdeauxMacro(text);
  const result = visitUrl("fight.php?action=macro&macrotext=" + urlEncode(macro),true,true);
  const fightResult = parseFightResult(text, result);
  printHtml(`<pre>${JSON.stringify(fightResult, null, 2)}</pre>`);
}
