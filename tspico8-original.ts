// deno-lint-ignore-file no-unused-vars
import * as commander from "commander";
//import * as chokidar from "chokidar";
import * as uglifyJS from "uglify-js";
import ts from "typescript";
//import {jspiclCli} from "../deno-jspicl/src/mod.ts"
import {jspiclCli} from "./jspicl-cli.bundle.js"

//import * as jspicl from "jspicl";

import * as dpath from "https://deno.land/std@0.184.0/path/mod.ts";
import { decode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { PicoPath, ToCopyResources } from "./to-copy-resources.ts";
import { FileResource } from "./to-copy-resources.ts";

// This defines the default location for pico-8 on various platforms
// If none of these are found the pico-8 entry in tspico8.json is used
const pico8PathMap = [
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

const utf8Decoder = new TextDecoder("utf-8");
const utf8Encoder = new TextEncoder();

type OptionsType = {
  d: string;
}

type NullableProcess = Deno.ChildProcess | null;

const getFullPathSync = (sysPath: string) => {
  return dpath.join(Deno.realPathSync(dpath.dirname(sysPath)), dpath.basename(sysPath));
}

const existsSync = (sysPath: string) => {
  let result = false;
  try {
    const info = Deno.statSync(sysPath);
    result = (info.isDirectory || info.size > 0);
    console.log(sysPath, result);
  } catch (err) {
    // ignoring
  }
  return result;
}

export type execSyncParams = {
  args? : Array<string>;
  cwd? : string;
  encoding?: string;
} 

const execSync = (exePath: string, {args, cwd} : execSyncParams) => {
  args = args || [];
  console.log(exePath, args, cwd);
  let current = "";
  if(cwd) {
    current = Deno.cwd();
    Deno.chdir(cwd);
  }
  const result = (new Deno.Command(exePath, {args: args}).outputSync());
  if(current) {
    Deno.chdir(current);
  }

  return result;
}

const program = new commander.Command();
program
  .command("init")
  .description(
    `Copy the required files to the directory specified. If a file already exists, it will be skipped.`,
  )
  .requiredOption("-d <directory>", "the directory to initialize")
  .action((options: OptionsType) => {
    init(getFullPathSync(options.d));
  });

program
  .command("run")
  .description(" Build, watch, and launch your PICO-8 game")
  .requiredOption("-d <directory>", "the directory to run the build pipeline")
  .action(async (options: OptionsType) => {
    await build(getFullPathSync(options.d));
  });

program.parse();

/**
 * Initialization code
 * Copy required files to working dir
 */
function init(workDir: string): void {
  const files = ToCopyResources.files;
  
  const buildDir = dpath.join(workDir, "build");
  const compileJs = dpath.join(buildDir, "compiled.js");

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
    const to = dpath.join(workDir, file.name);

    if(existsSync(to)) {
      console.log(`/!\\ ${file} already exists in directory, skipping.`);
      return false;
    }
    const data = decode(file.data);
    Deno.writeFileSync(to, data);
    return true;
  });

  console.log(
    `\nCopying complete. Edit the ${workDir}/tspico8.json, then type "bin/tspico8 run -d ${workDir}."`,
  );
  Deno.exit(0);
}

function readFileSync(filePath: string, decoder?: TextDecoder): string { 
  return (decoder || utf8Decoder).decode(Deno.readFileSync(filePath));
}
function writeFileSync(filePath: string, data: string): void {
  Deno.writeFileSync(filePath, utf8Encoder.encode(data));
}

// Location of the TypeScript config file
function getTSConfig(workDir: string): any {
  const tsConfigPath = dpath.join(workDir, "tsconfig.json");
 
  return JSON.parse(readFileSync(tsConfigPath));
}

// Location of the transpiler config file
function getTSPicoConfig(workDir: string): any {
  const tsConfigPath = dpath.join(workDir, "tspico8.json");
  return JSON.parse(readFileSync(tsConfigPath));
}

// Location of the output generated by TypeScript (tsc)
function getOutfile(workDir: string): string {
  const tsConfig = getTSConfig(workDir);
  return dpath.join(workDir, tsConfig.compilerOptions.outFile);
}

// Location of the output file after compression (uglified)
function getOutfileCompressed(workDir: string): string {
  const picoConfig = getTSPicoConfig(workDir);
  return dpath.join(workDir, picoConfig.compression.compressedFile);
}

/**
 * Return a string that points to the pico-8 executable
 * or an empty string if it cannot be found.
 */
function picoPath(workDir: string): string {
  const config = getTSPicoConfig(workDir);
  const cPico: {
    executable: string;
  } = config["pico8"];

  let picoPath = "";

  // attempt to use default locations for pico-8, and cascade to config if not found
  const mapPath = pico8PathMap.find(i => i.name === Deno.build.os)?.path || ""; 
  if (mapPath && existsSync(mapPath)) {
    picoPath = mapPath;
  } else if (cPico.executable && existsSync(cPico.executable)) {
    picoPath = cPico.executable;
  }
  return picoPath;
}

/**
 * Launch pico-8 with the game file
 */
function launchPico(
  picoPath: string,
  cartridgePath: string,
  workDir: string,
): NullableProcess {
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

function walkFolder (dir: string): string[] {
  const result = [] as Array<string>;
  const files = Deno.readDirSync(dir);
  for (const file of files) {
    if (file.isDirectory) {
      result.push(...walkFolder(dpath.join(dir, file.name)));
    } else {
      result.push(dpath.join(dir, file.name));
    }
  };
  return result;
}

/*
 * Compile the TypeScript code
 */
function compileTS(fullDestDir: string): void {
  const fileNames = walkFolder(fullDestDir).filter(f => f.endsWith(".ts"));
  const outFile = dpath.join(fullDestDir, "build/compiled.js");
  const options = {
    lib: ["lib.es5.d.ts"],
    target: ts.ScriptTarget.ES2015, // es6 ???
    outFile,
    strict: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    module: ts.ModuleKind.ES2015,
  } as ts.CompilerOptions; 

  let program = ts.createProgram(fileNames, options);
  let emitResult = program.emit();
  let allDiagnostics = ts
  .getPreEmitDiagnostics(program)
  .concat(emitResult.diagnostics);

  allDiagnostics.forEach((diagnostic: ts.Diagnostic) => {
    if (diagnostic.file) {
      let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    }
  });

  let exitCode = emitResult.emitSkipped ? 1 : 0;
  console.log(`Process exiting with code '${exitCode}'.`);
  //process.exit(exitCode);

/*
compile(process.argv.slice(2), {
noEmitOnError: true,
noImplicitAny: true,
target: ts.ScriptTarget.ES5,
module: ts.ModuleKind.CommonJS
});
*/
  //execSync("tsc", { encoding: "utf-8", cwd: fullDestDir });
}

/*
 * Run the generated JavaScript (from tsc)
 * through uglify to produce the compressed source code
 */
function compressGameFile(workDir: string): void {
  const config = getTSPicoConfig(workDir);
  const buildStr = readFileSync(getOutfile(workDir));

  const cCompress: {
    compressedFile: string;
    indentLevel: number;
    compress: boolean;
    mangle: boolean;
  } = config["compression"];

  const result = uglifyJS.minify(buildStr, {
    compress: cCompress.compress ? { ...config["compressOptions"] } : false,
    mangle: cCompress.mangle ? { ...config["mangleOptions"] } : false,
    output: {
      semicolons: false, // Only works if `mangle` or `compress` are set to false
      beautify: !(cCompress.mangle || cCompress.compress),
      indent_level: cCompress.indentLevel,
      // Always keep the significant comments: https://github.com/nesbox/TIC-80/wiki/The-Code
      comments:
        cCompress.compress || cCompress.mangle
          ? RegExp(/title|author|desc|script|input|saveid/)
          : true,
    },
  });

  if(!result.code) {
    console.log(result);
  }
  if ((result.code?.length || 0) < 10) {
    console.log("Empty code.");
    console.log(buildStr);
  } 

  writeFileSync(getOutfileCompressed(workDir), result.code);
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

  //jspicl.jspicl(jsFile, {})

  await jspiclCli({ input: jsFile, output: newGameFile, spritesheetImagePath: spriteFile, cartridgePath: refGameFile })
  // execSync(
  //   jsPicl,
  //   { args: [
  //     `--input ${jsFile}`,
  //     `--output ${newGameFile}`,
  //     `--spritesheetImagePath ${spriteFile}`,
  //     `--cartridgePath ${refGameFile}`,
  //   ] });
}

/*
 * Assemble the assets (code and spritesheet) into a .p8 file
 */
async function buildGameFile(workDir: string): Promise<void> {
  const outFileCompressed = getOutfileCompressed(workDir);
  const gameFile = dpath.join(workDir, "game.p8");
  const spriteFile = dpath.join(workDir, "spritesheet.png");
  await compileCart(outFileCompressed, gameFile, spriteFile, gameFile);
}

/**
 * Compile, compress, run
 */
async function build(workDir: string): Promise<void> {
  const pPath = picoPath(workDir);
  const gameFile = dpath.join(workDir, "game.p8");
  const toWatch = [
    dpath.join(workDir, "**/*.ts"),
    dpath.join(workDir, "spritesheet.png"),
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
    if (pPath.length > 0) {
      console.log("tspico8: Launching Pico8!")

      // Kill the existing pico-8 process if it is running
      if (proc) {
        console.log("Killing existing pico-8 process.");
        proc.kill();
      }
      console.log("Launching pico-8.");
      proc = launchPico(pPath, gameFile, workDir);
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


