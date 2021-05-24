import {DOMParser, XMLSerializer} from "xmldom";
// @ts-ignore
import {parse, selectWithResolver, useNamespaces, XPath} from "xpath";
import * as console from 'libram/dist/console';
//import {print} from "kolmafia";

const domOptions = {
  locator:{},
  errorHandler: {
    'error': console.error,
    'fatalError': console.error,
  }
}

class Path {
  constructor(private parsed: ReturnType<typeof parse>) {
  }
  evaluateString(node: Node): string { return this.parsed.evaluateString({ isHtml: true, node }); }
  evaluateBoolean(node: Node): boolean { return this.parsed.evaluateBoolean({ isHtml: true, node }); }
  select(node: Node): Node[] { return this.parsed.select({ isHtml: true, node }); }
  select1(node: Node): Node | undefined { return this.parsed.select1({ isHtml: true, node }); }
}

const paths: Record<string, Path> = {};
const xpath = (expression: string) => {
  return paths[expression] ?? (paths[expression] = new Path(parse(expression)));
}

export type MacroAction = {
  action: string,
  first?: string,
  second?: string,
}

interface Chunk {
  node: Node,
  text?: string,
  comment?: string,
}
interface Round {
  htmlNode: Node;
  turn: number;
  macroAction?: MacroAction,
  chunks: Chunk[];
}
interface AfterFightMessage {
  htmlNode: Node;
  chunks: Chunk[];
}

interface ParseResult {
  rounds: Round[],
  afterFightMessage: AfterFightMessage,
}

const re_onturn = /var onturn = (\d+);/;
const re_macro = /\s*macroaction:\s*(\w+)\s*(?:(\d+)(?:,\s*(\d+))?)?/;

function parseMacroAction(macroaction: string): MacroAction | undefined {
  const match = re_macro.exec(macroaction);
  if (!match) {
    console.error("Strange macroaction: " + macroaction);
    return undefined;
  }
  const [_, action, first, second] = match;
  return { action, first, second };
}

function containsTextOrComments(node: Node) {
  return xpath('boolean(descendant-or-self::text() | descendant-or-self::comment())').evaluateBoolean(node)
}

function appendChunk(container: { htmlNode: Node; chunks: Chunk[] }, node: Node, ignoreEmpty = true) {
  if (ignoreEmpty && !containsTextOrComments(node)) {
    return;
  }
  container.htmlNode.appendChild(node);
  container.chunks.push({ node })
}

export function parseFightHtml(text: string): ParseResult {
  const tree = new DOMParser({...domOptions}).parseFromString(text, "text/html");

  const fightInfo = xpath('//comment()[normalize-space()="faaaaaaart"]/following-sibling::table').select1(tree);
  if (!fightInfo) {
    throw new Error('Cannot parse this fight');
  }
  const fightBody = (
    xpath('.//span[@id="monname"]/following::blockquote[1]/following::center[1]').select1(fightInfo)
    ?? xpath('.//span[@id="monname"]/ancestor::center[1]').select1(fightInfo)
  ) as Node;
  if (!fightBody) {
    throw new Error('Cannot parse this fight');
  }

  let turn = 0;
  // handle some special scripts, and remove them all
  for (const script of xpath('//script').select(tree)) {
    if (script.textContent) {
      if (script.textContent.includes("state['fightover'] = true;")) {
        script.parentNode!.replaceChild(tree.createElement('fightover'), script);
        continue;
      }
      const turnMatch = re_onturn.exec(script.textContent);
      if (turnMatch) {
        turn = Number(turnMatch[1])
      }
    }
    script.parentNode!.removeChild(script);
  }
  for (const fightForm of xpath('.//div[@id="fightform"]').select(tree)) {
    fightForm.parentNode!.replaceChild(tree.createElement('fightform'), fightForm);
  }


  const rounds: Round[] = [];
  let currentRound: Round | undefined;

  const newRound = (macroAction: MacroAction | undefined) => {
    const htmlNode = tree.createElement('round');
    const round = {
      htmlNode,
      turn,
      macroAction,
      chunks: [],
    };
    turn += 1;
    rounds.push(round);
    currentRound = round;
    return round;
  }

  const macroComment = xpath('normalize-space(preceding::comment()[starts-with(normalize-space(), "macroaction")])').evaluateString(fightBody);
  const firstMacroAction = macroComment ? parseMacroAction(macroComment) : undefined;
  currentRound = newRound(firstMacroAction);

  for (const emptyP of xpath('//p[not(./*)]').select(tree)) {
    let next = emptyP.nextSibling;
    while (next) {
      const node = next;
      next = node.nextSibling;
      switch (node.nodeName.toLowerCase()) {
        case 'br':
          emptyP.appendChild(tree.createTextNode('\n'));
          // fall-through
        case '#text':
        case '#comment':
        case 'i':
        case 'b':
        case 'u':
        case 'font':
          emptyP.appendChild(node);
          continue;
      }
      break // stop slurping up siblings
    }
  }

  let nextChild = fightBody.firstChild;
  while (nextChild) {
    const child = nextChild;
    nextChild = child?.nextSibling;

    if (xpath('boolean(.//span[@id="monname"])').evaluateBoolean(child)) {
      continue
    }

    if (child.nodeName === 'a' || child.nodeName === 'hr') {
      continue;
    }
    if (child.nodeName === 'fightover' || child.nodeName === 'fightform') {
      break;
    }

    if (xpath('self::comment()[starts-with(normalize-space(), "macroaction")]').select1(child)) {
      const macroaction = parseMacroAction((child as any).data);
      newRound(macroaction);
      continue;
    }

    appendChunk(currentRound, child);
  }

  const afterFightMessage: AfterFightMessage = {
    htmlNode: tree.createElement('afterFightMessage'),
    chunks: []
  };

  while (nextChild) {
    const child = nextChild;
    nextChild = child?.nextSibling;

    if (child.nodeName === 'a') {
      continue;
    }

    if (child.nodeName === 'fightform') {
      continue;
    }

    if (child.nodeName === 'center' && !child.nextSibling) {
      nextChild = child.firstChild;
      continue;
    }

    const text = xpath('normalize-space()').evaluateString(child);
    appendChunk(afterFightMessage, child);
  }

  const processChunk = (chunk: Chunk) => {
    const { node } = chunk;

    for (const font of xpath('.//font[@color]').select(node)) {
      const color = xpath('self::font/@color').evaluateString(font);
      if (color) {
        //font.insertBefore(tree.createTextNode(`${color} `), font.firstChild);
        font.appendChild(tree.createTextNode(` ${color}`));
      }
    }

    if (xpath('self::comment()').evaluateBoolean(node)) {
      chunk.comment = (node as any).data;
    } else {
      chunk.text = xpath('normalize-space()').evaluateString(node);
    }
  }

  for (const round of rounds) {
    for (const chunk of round.chunks) {
      processChunk(chunk);
    }
  }
  for (const chunk of afterFightMessage.chunks) {
    processChunk(chunk);
  }


  return { rounds, afterFightMessage };
}

function main() {
  const fs = require('fs');
  const text = fs.readFileSync(process.argv[2], 'utf-8');
  const { rounds, afterFightMessage } = parseFightHtml(text);

  const serializer = new XMLSerializer();
  for (const round of [...rounds, afterFightMessage]) {
    const { htmlNode, chunks, ...rest } = round;
    const html = serializer.serializeToString(htmlNode);
    //const message = xpath.select('normalize-space(.)', round);
    const serializedChunks = chunks.map(({node, ...c}) => {
      const html = serializer.serializeToString(node);
      return { html, ...c }
    })
    console.log({
      type: htmlNode.nodeName,
      html,
      ...rest,
      chunks: serializedChunks,
    });
  }
}
//main();