import { path } from "./deps.ts";
import { tokenCounter } from "./token-counter.ts";

const ICONS = {
  info: "\x1b[34mℹ",
  success: "\x1b[32m✔",
  warning: "\x1b[33m⚠",
  error: "\x1b[31m✖"
};

export function logToFile (content: string, filePath: string) {
//   mkdirp.sync(path.dirname(filePath));
  Deno.writeTextFile(path.resolve(filePath), content);
}

export function logInfo (content: string) {
  logToConsole(ICONS.info, content);
}

export function logSuccess (content: string) {
  logToConsole(ICONS.success, content);
}

export function logWarning (content: string) {
  logToConsole(ICONS.warning, content);
}

export function logError (content: string) {
  logToConsole(ICONS.error, content);
}

function logToConsole (icon: string, content: string) {
  console.log(`${icon} ${content}\x1b[0m`);
}

export function logStats (lua: string, polyfillOutput: string, code: string) {
  const tokens = tokenCounter(lua);
  const polyfillTokens = tokenCounter(polyfillOutput);

  const stats = [
    {
      label: "Characters",
      value: lua.length,
      percent: `${~~(lua.length * 100 / 65535)}%`
    },
    {
      label: "Tokens",
      value: `~${tokens}`,
      percent: `${~~(tokens * 100 / 8192)}%`
    },
    {
      label: "  - Polyfills",
      value: `~${polyfillTokens}`
    },
    {
      label: "Filesize",
      value: `${Math.ceil(code.length / 1024)} KB`
    }
  ];

  logInfo("Cartridge Statistics");
  console.log("".padEnd(41, "—"));
  stats.forEach(stats => {
    const label = `${stats.label}:`.padEnd(20, " ");
    const value = `${stats.value}`.padStart(15, " ");
    const percent = stats.percent ? `\x1b[33m${stats.percent}`.padStart(10, " ") : "";

    console.log(`${label}${value}${percent}\x1b[0m`);
  });
}
