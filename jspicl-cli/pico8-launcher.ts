
import { logSuccess, logWarning } from "./logging.ts";
import { execSync, spawn } from "./process-helper.ts";
import { JspiclPluginOptions } from "./constants.ts";
import { path } from "../deps.ts";

const pico8PathMap = {
  windows: `"C:\\Program Files (x86)\\PICO-8\\pico8.exe"`, // eslint-disable-line quotes
  darwin: "/Applications/PICO-8.app/Contents/MacOS/pico8",
  linux: "~/pico-8/pico8"
};

export function createPico8Launcher ({ watch, customPicoPath, reloadOnSave, pipeOutputToConsole }: JspiclPluginOptions) {
  let picoProcess: Promise<Deno.CommandOutput> | null = null;

  return (cartridgePath: string) => {
    if (!watch || !cartridgePath) {
      return;
    }

    if (picoProcess) {
      if (!reloadOnSave) {
        return;
      }

      if (Deno.build.os === "darwin") {
        // Currently only MacOS supports auto reloading when saving.
        logSuccess("Reloading cartridge in PICO-8");

        execSync("osascript", 
          [`${path.join(Deno.cwd(), "reload-pico8.applescript")}`]);
      }
      else {
        logWarning("Autoreloading is currently only supported on MacOS. Please press Ctrl+R in PICO-8 to see new changes.");
      }
    }
    else {
      logSuccess("Running cartridge in PICO-8");
      // Use customized path if available, otherwise fallback to the default one for the current OS
      const picoPath = customPicoPath || pico8PathMap[Deno.build.os as "windows" | "darwin" | "linux"];

      picoProcess = spawn(picoPath, {
        args: ["-run", `"${path.resolve(cartridgePath)}"`],
        shell: true,
        stdio: pipeOutputToConsole ? "inherit" : "pipe"
      }) as Promise<Deno.CommandOutput>;

      
      picoProcess.then(({code}: Deno.CommandOutput)  => {
        picoProcess = null;
        code && console.log(`Pico-8 process exited with code ${code}`); // eslint-disable-line no-console
      });
    }
  };
}
