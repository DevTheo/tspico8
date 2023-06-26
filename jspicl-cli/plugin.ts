import { JspiclPluginOptions, defaultOptions } from "./constants.ts";
import { generateCartridgeContent, getCartridgeSections } from "./cartridge.ts";
import { /*logStats,*/ logToFile, logSuccess } from "./logging.ts";
import { getSpritesheetFromImage } from "./spritesheet.ts";
import { createPico8Launcher } from "./pico8-launcher.ts";
import { transpile } from "./transpile.ts";

export type GenerateBundleOptions = {
    file: string;
} 

export default function plugin (customizedOptions: JspiclPluginOptions) {
  const options = {
    ...defaultOptions,
    ...customizedOptions
  } as JspiclPluginOptions;

  if (!options.cartridgePath) {
    throw new Error("Ensure that 'cartridgePath' property in options is set.");
  }

  if (!options.spritesheetImagePath) {
    throw new Error("Ensure that 'spritesheetImagePath' property in options is set.");
  }

  let runOnce = true;
  const runPico = createPico8Launcher(options);

  return {
    name: "jspicl",

    buildStart () {
      if (runOnce) {
        options.watch && logSuccess("Watching source files for changes");
        logSuccess("Building cartridge");
      }

      runOnce = false;
      if(options.watch) {
        logSuccess("Not watching (disabled for now)");
        //this.addWatchFile(options.spritesheetImagePath);
      }
    },

    async renderChunk (javascriptCode: string) {
      const {
        cartridgePath,
        jsOutput,
        luaOutput,
        // deno-lint-ignore no-unused-vars
        showStats,
        spritesheetImagePath
      } = options;

      const transpiledSource = transpile(javascriptCode, options);
      const cartridgeSections = getCartridgeSections(cartridgePath);
      logSuccess("Reading Gfx");
      const gfxSection = await getSpritesheetFromImage(spritesheetImagePath);
      logSuccess("Read Gfx");
      const code = generateCartridgeContent({
        ...cartridgeSections,
        lua: transpiledSource,
        gfx: gfxSection
      });
      logSuccess("Generated cart");

      // Statistics
      jsOutput && logToFile(javascriptCode, jsOutput);
      luaOutput && logToFile(transpiledSource.lua, luaOutput);
      //showStats && logStats(transpiledSource.lua, transpiledSource.polyfillOutput, code);

      logSuccess("Complete");
      return {
        code
      };
    },

    watchChange () {
      console.clear();
      logSuccess("Change detected, rebuilding cartridge");
    },

    generateBundle ({ file }: GenerateBundleOptions) {
      runPico(file);
      options.watch && console.log("\nPress Ctrl+C to stop watching");
    }
  };
}
