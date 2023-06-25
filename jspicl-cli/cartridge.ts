import { path } from "../deps.ts";

export type generateCartridgeContentOpts = {
    lua?: string | undefined;
    gff?: string | undefined;
    gfx?: string | undefined;
    music?: string | undefined;
    map?: string | undefined;
    sfx?: string | undefined;
}

export function generateCartridgeContent ({
  lua = "",
  gff,
  gfx,
  music,
  map,
  sfx
}: generateCartridgeContentOpts) {
  return [
    "pico-8 cartridge // http://www.pico-8.com",
    "version 8",
    `__lua__\n${lua}`,
    gfx && `__gfx__\n${gfx}`,
    gff && `__gff__\n${gff}`,
    map && `__map__\n${map}`,
    sfx && `__sfx__\n${sfx}`,
    music && `__music__\n${music}`,
    "\n"
  ].join("\n");
}

const decoder = new TextDecoder("utf-8");

export function getCartridgeSections (cartridgePath: string) {
  const contents = decoder.decode(Deno.readFileSync(path.resolve(cartridgePath)));

  // deno-lint-ignore no-explicit-any
  const cartridgeSections = {} as any;
  let content, section;

  // Extract the contents of each section
  const regex = /__([a-z]+)__\n([\s\S]*?)(?=\n__\w+__\n|\n(\n|$))/g;
  // deno-lint-ignore no-cond-assign
  while ([, section, content] = regex.exec(contents) || "") { // eslint-disable-line no-cond-assign
    cartridgeSections[section] = content;
  }

  return cartridgeSections;
}
