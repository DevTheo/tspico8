
import { path } from "./deps.ts";
import * as jspiclPlugin from "./plugin.ts";

export type JsPiclCliOptions = {
    /// Path to entry point
    input: string;
    /// Path the generated PICO-8 cartridge
    output: string;
    /// Path to a spritesheet 
    spritesheetImagePath: string; 
    /// Path to existing cartridge
    cartridgePath: string;
    ///Include jspicl info in code
    includeBanner?: boolean | undefined;
    /// Path to JavaScript output
    jsOutput?: string | undefined;
    /// Path to lua output
    luaOutput?: string | undefined;
    /// Display build stats
    showStats?: boolean | undefined;
    /// Output console.log to terminal
    pipeOutputToConsole?: boolean | undefined;
    /// Re-run cartridge when updated
    reloadOnSave?: boolean | undefined;
    /// Path to a module that exports a transformation method
    polyfillTransform?: string | undefined;
    /// Path to PICO-8 executable
    customPicoPath?: string | undefined;
    /// Format LUA code
    prettify?: boolean | undefined;
    /// Reload cartridge on rebuilds
    watch?: boolean | undefined;
}

// function getInputOptions ({ input, _output, ...jspiclOptions } : JsPiclCliOptions) {
//     return {
//         input,
//         plugins: [
//         includePaths({
//             paths: [path.resolve(input)]
//         }),
//         buble(),
//         {
//             renderChunk: source => source.replace(/\/\/ <!-- DEBUG[^//]*\/\/\s-->/g, "")
//         },
//         jspiclPlugin(jspiclOptions)
//         ]
//     };
// }

// type GetOutputOptionsParams = {
//     output: string;
// }

// function getOutputOptions ({ output }: GetOutputOptionsParams) {
//     return {
//         file: output,
//         format: "esm",
//         freeze: false
//     };
// }

export const jspiclCli = async (config: JsPiclCliOptions): Promise<void> => {

    if (config.jsOutput && typeof config.jsOutput === "boolean") {
        const filename = path.basename(config.output, path.extname(config.output));
        config.jsOutput = path.resolve(path.join(path.dirname(config.output), `${filename}.js`));
    }

    if (config.luaOutput && typeof config.luaOutput === "boolean") {
        const filename = path.basename(config.output, path.extname(config.output));
        config.luaOutput = path.resolve(path.join(path.dirname(config.output), `${filename}.lua`));
    }

    // console.dir(config);

    //function getWatchOptions (config) {
    // return {
    //     ...getInputOptions(config),
    //     output: [getOutputOptions(config)],
    //     watch: {
    //     clearScreen: true,
    //     chokidar: true,
    //     exclude: "node_modules/**"
    //     }
    // };
    //}

    // (async function build () {
    // try {
    //     if (config.watch) {
    //     console.clear();
    //     rollup.watch(getWatchOptions(config));
    //     }
    //     else {
    //     const bundle = await rollup.rollup(getInputOptions(config));
    //     await bundle.write(getOutputOptions(config));
    //     }
    // }
    // catch (e) {
    //     console.error(e.message);
    // }
    // })();
    const builder = jspiclPlugin.default({
        cartridgePath: config.cartridgePath,
        spritesheetImagePath: config.spritesheetImagePath,
        includeBanner: config.includeBanner || false,
        jsOutput: config.jsOutput, // this might need to change
        luaOutput: config.luaOutput, // this might need to change
        showStats: config.showStats || false,
      
        customPicoPath: config.customPicoPath,
        pipeOutputToConsole: config.pipeOutputToConsole,
        //reloadOnSave: config.reloadOnSave,
      
        //watch: config.watch,
      
        //polyfillTransform: undefined //config.polyfillTransform
    });
    builder.buildStart();
    const js = (await Deno.readTextFile(config.input)).replace(/\/\/ <!-- DEBUG[^//]*\/\/\s-->/g, "");
    const cart = await builder.renderChunk(js);
    await Deno.writeTextFile(config.output, cart.code);
};