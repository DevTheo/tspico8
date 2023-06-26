import { getTSPicoConfig } from "./config-utils.ts";
import { existsSync, getFullPathSync } from "./file-utils.ts";
import { NullableProcess } from "./shell-utils.ts";

export type PicoPath = {
    name: string;
    path: string;
}

// This defines the default location for pico-8 on various platforms
// If none of these are found the pico-8 entry in tspico8.json is used
export const pico8PathMap = [
    {
      name: "windows",
      path: `"C:\\Program Files (x86)\\PICO-8\\pico8.exe"`, // eslint-disable-line quotes
    },
    {
      name: "darwin",
      path: "/Applications/PICO-8.app/Contents/MacOS/pico8",
    },
    {
      name: "linux",
      path: "~/pico-8/pico8",
    } 
] as Array<PicoPath>;

/**
 * Return a string that points to the pico-8 executable
 * or an empty string if it cannot be found.
 */
export const picoPath = (workDir: string): string => {
    const config = getTSPicoConfig(workDir);
  
    let picoPath = "";
  
    // attempt to use default locations for pico-8, and cascade to config if not found
    const mapPath = pico8PathMap.find(i => i.name === Deno.build.os)?.path || ""; 
    if (mapPath && existsSync(mapPath)) {
      picoPath = mapPath;
    } else if (config.pico8?.executable && existsSync(config.pico8?.executable)) {
      picoPath = config.pico8!.executable;
    }
    return picoPath;
}
  

/**
 * Launch pico-8 with the game file
 */
export const launchPico = (
                     picoPath: string,
                     cartridgePath: string,
                     workDir: string,
              ): NullableProcess => {
  if(!existsSync(picoPath)) {
    return null; // do nothing
  }
  
  console.log(
    `${picoPath} -root_path ${workDir} -run ${getFullPathSync(cartridgePath)}`,
  );

  let picoProcess: NullableProcess = new Deno.Command(
    picoPath, {
      args: ["-root_path", workDir, "-run", `"${getFullPathSync(cartridgePath)}"`] 
    }).spawn();

  // let picoProcess = child_process.spawn(
  //   picoPath,
  //   ["-root_path", workDir, "-run", `"${path.resolve(cartridgePath)}"`],
  //   {
  //     shell: true,
  //   },
  // );

  picoProcess.output().then(({code} : Deno.CommandOutput) => {
    picoProcess = null;
    code && console.log(`Pico-8 process exited with code ${code}.`); // eslint-disable-line no-console
  });
  return picoProcess;
}