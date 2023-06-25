// deno-lint-ignore-file no-unused-vars

import { ToCopyResources, FileResource } from "./to-copy-resources.ts";
import { tscSync } from "./tsc.ts";
import { existsSync, getFullPathSync, readFileSync, walkFolder, writeFileSync } from "./file-utils.ts";
import { getOutfile, getOutfileCompressed } from "./config-utils.ts";
import { launchPico, picoPath } from "./pico-utils.ts";
import { NullableProcess } from "./shell-utils.ts";
import { Denomander, jspiclCli, base64, path } from "./deps.ts";

// type OptionsType = {
//   d: string;
// }

const program = new Denomander(
  {
    app_name: "tspico8",
    app_description: "Write Pico8 games in typescrypt",
    app_version: "1.0.0",
    options: {
      help: "classic",
    },
  },
);

program
  .command("init",
    `Copy the required files to the directory specified. If a file already exists, it will be skipped.`,
  )
  .requiredOption("-d --directory", "the directory to initialize")
  .action(() => {
    init(getFullPathSync(program.directory));
  });

program
  .command("run", " Build, watch, and launch your PICO-8 game")
  .requiredOption("-d --directory", "the directory to run the build pipeline")
  .action(async () => {
    console.log(program.directory);
    await build(getFullPathSync(program.directory));
  });

try {
  program.parse(Deno.args);
} catch (error) {
  console.log(error);
}

/**
 * Initialization code
 * Copy required files to working dir
 */
function init(workDir: string): void {
  const files = ToCopyResources.files;
  
  const buildDir = path.join(workDir, "build");
  const compileJs = path.join(buildDir, "compiled.js");

  // Create the destination directory if it doesn't exist
  !existsSync(workDir) && Deno.mkdirSync(workDir, { recursive: true });

  // Create the build directory if it doesn't exist
  !existsSync(buildDir) && Deno.mkdirSync(buildDir, { recursive: true });
  // Create an empty compiled.js file if it doesn't exist
  Deno.createSync(compileJs).close();

  console.log(
    `The following files will be added to the ${workDir} directory:`,
  );

  // Fetch all files to copy
  files.forEach((file: FileResource) => {
      console.log(file.name);
  });

  const ok = confirm("Proceed to copy? (y/n)"); //.then((ok) => {
  if (!ok) {
    console.log("Stopping installation.");
    Deno.exit(0);
  }

  // Copy files to the working directory
  files.forEach((file: FileResource) => {
    const to = path.join(workDir, file.name);

    if(existsSync(to)) {
      console.log(`/!\\ ${file} already exists in directory, skipping.`);
      return false;
    }
    const data = base64.decode(file.data);
    Deno.writeFileSync(to, data);
    return true;
  });

  console.log(
    `\nCopying complete. Edit the ${workDir}/tspico8.json, then type "bin/tspico8 run -d ${workDir}."`,
  );
  Deno.exit(0);
}

/*
 * Compile the TypeScript code
 */
function compileTS(fullDestDir: string): void {
  const fileNames = walkFolder(fullDestDir).filter(f => f.endsWith(".ts"));
  
  const outFile = path.join(fullDestDir, "build/compiled.js");

  const result = tscSync({tsFilePaths:fileNames, outputTo:outFile, noModule:true});

  if(!result.success) {
    console.log(result.errors)
    Deno.exit(0);
  }
  console.log(`Process exiting with code '1'.`);
}

/*
 * Run the generated JavaScript (from tsc)
 * through uglify to produce the compressed source code
 */
function compressGameFile(workDir: string): void {
  //const config = getTSPicoConfig(workDir);
  const buildStr = readFileSync(getOutfile(workDir));

  writeFileSync(getOutfileCompressed(workDir), buildStr);
}

async function compileCart(
  jsFile: string,
  newGameFile: string,
  spriteFile: string,
  refGameFile: string,
): Promise<void> {
  console.log(
    `jspicl-cli --input ${jsFile} --output ${newGameFile} --spritesheetImagePath ${spriteFile} --cartridgePath ${refGameFile}`,
  );

  await jspiclCli({ input: jsFile, output: newGameFile, spritesheetImagePath: spriteFile, cartridgePath: refGameFile })
}

/*
 * Assemble the assets (code and spritesheet) into a .p8 file
 */
async function buildGameFile(workDir: string): Promise<void> {
  const outFileCompressed = getOutfileCompressed(workDir);
  const gameFile = path.join(workDir, "game.p8");
  const spriteFile = path.join(workDir, "spritesheet.png");
  await compileCart(outFileCompressed, gameFile, spriteFile, gameFile);
}

/**
 * Compile, compress, run
 */
async function build(workDir: string): Promise<void> {
  const pico8ExePath = picoPath(workDir);
  const gameFile = path.join(workDir, "game.p8");
  const toWatch = [
    path.join(workDir, "**/*.ts"),
    path.join(workDir, "spritesheet.png"),
  ];
  let proc: NullableProcess = null;

  async function buildAll() {
    console.log("Compiling TypeScript to JavaScript.");
    compileTS(workDir);
    console.log("Compressing JavaScript.");
    compressGameFile(workDir);
    console.log("Building game file.");
    await buildGameFile(workDir);
    console.log("tspico8: cart built!")
    if (pico8ExePath.length > 0) {
      console.log("tspico8: Launching Pico8!")

      // Kill the existing pico-8 process if it is running
      if (proc) {
        console.log("Killing existing pico-8 process.");
        proc.kill();
      }
      console.log("Launching pico-8.");
      proc = launchPico(pico8ExePath, gameFile, workDir);
      console.log("tspico9: Launched Pico8!")
    }
  }

  // Do the initial build and launch pico-8
  await buildAll();

  // watch for changes and update accordingly
  // don't use tsc --watch because we want more granular control
  // over the steps of the build process
  
  // chokidar.watch(toWatch).on("change", (path, stats) => {
  //   try {
  //     buildAll();
  //   } catch (e) {
  //     console.error(e);
  //   }
  // });
}


