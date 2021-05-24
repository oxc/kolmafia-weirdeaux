import {generateWeirdeauxMacro} from "./weirdeaux";
import {haveEquipped, myName, print, printHtml} from "kolmafia";
import {analyzeFight} from "./analysis";
import {parseFightHtml} from "./fightParser/htmlParser";
import {getMacroAction, getMacroLogString} from "./fightParser";

export function main(round: number, opp: Monster, text: string): void {
  const macro = generateWeirdeauxMacro(text);
  //printHtml(`generateWeirdeauxMacro returned: <pre>${macro.components.join('\n')}</pre>`);
  const result = macro.submit();
  try {
    debugFight(text);
    debugFight(result);
  } catch (e) {
    print(e.toString(), 'red');
  }
  analyzeFight(text, result);
}

function debugFight(text: string) {
  print('Parsing...')
  const { rounds, afterFightMessage } = parseFightHtml(text);
  print('Done.')
  for (const round of rounds) {
    if (!round.macroAction) {
      print(`Round ${round.turn}: ${myName()} did something, I guess...`);
    } else {
      const macroAction = getMacroAction(round.macroAction);
      print(`Round ${round.turn}: ${getMacroLogString(macroAction)}`);
      if (macroAction?.action === 'skill' && macroAction.skill === Skill.get('Shell up')) {
        const itemDbg = `badge: ${haveEquipped(Item.get("attorney's badge"))}, stoneHead: ${haveEquipped(Item.get('ancient stone head'))}`;
        if (round.chunks.find((c) => c.text?.includes('Storm Tortoise surrounds you in a shell of solid lightning'))) {
          print(`Round ${round.turn}: Shell Up cast sucessfully. ${itemDbg}`, 'blue');
        }
        if (round.chunks.find((c) => c.text?.includes('bound by chains of arcing lightning'))) {
          print(`Round ${round.turn}: Shell Up CONNECTED. ${itemDbg}`, 'green');
        }
        if (round.chunks.find((c) => c.text?.includes('paralyzed by the horror of its own existence'))) {
          print(`Round ${round.turn}: Monster paused, Shell Up didn't connect. ${itemDbg}`, 'red');
        }
        if (round.chunks.find((c) => c.text?.includes('weirdness of it distracts your opponent'))) {
          print(`Round ${round.turn}: Blocked by ancient stone head, Shell Up didn't connect. ${itemDbg}`, 'orange');
        }
        if (round.chunks.find((c) => c.text?.includes('OBJECTION'))) {
          print(`Round ${round.turn}: Blocked by attorney's badge, Shell Up didn't connect. ${itemDbg}`, 'orange');
        }
      }
    }
    for (const chunk of round.chunks) {
      print(`Round ${round.turn}: ${chunk.text}`, '#333333');
    }
  }
  for (const chunk of afterFightMessage.chunks) {
    print(`After Battle: ${chunk.text}`, '#333333');
  }
}