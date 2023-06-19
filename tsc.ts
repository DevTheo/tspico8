import { Project, ProjectOptions, ts } from "https://deno.land/x/ts_morph/mod.ts";

export type tscParams = {
    tsFilePaths?: string[]; 
    outputTo?: string; 
    tsCode?: string;
    noModule?: boolean;
} 

export type tscResult = {
    success: boolean;
    jsCode?: string;
    errors: string[];
}

export const tscSync = ({tsFilePaths, outputTo, noModule, tsCode}: tscParams) => {
    let compileFiles = tsFilePaths !== undefined;
    const saveToFile = outputTo !== undefined;
    const compileString = !compileFiles && tsCode !== undefined;

    if(!compileFiles && !compileString) {
        throw new Error("Either tsFilePaths or tsCode must be specified");
    }
    
    if(noModule && compileFiles) {
        tsCode = combineAndRemoveImportsExports(tsFilePaths!);
        compileFiles = false;
    }

    const result: tscResult = compileFiles ?
        tsc_files(tsFilePaths!) :
        tsc_string(tsCode!);
    
    if(saveToFile) {
        Deno.writeTextFileSync(outputTo!, result.jsCode!);
    }
    return result;
}

const tsc_files = (tsFilePaths: string[]): tscResult => {
    const opts = { 
        //tsConfigFilePath: path.join(Deno.cwd(), "sample/tsconfig.json")
        compilerOptions: {
            declaration: false,
            emitDeclarationOnly: false,
            allowJs: true,
            target: ts.ScriptTarget.ES5,
            moduleResolution: ts.ModuleResolutionKind.Node10,
        }
    } as ProjectOptions;
    const prj = new Project(opts);
    tsFilePaths.forEach(filePath => {
        prj.addSourceFileAtPath(filePath);
    });

    return compileCode(prj);
}
const tsc_string = (tsCode: string): tscResult => {
    const opts = { 
        //tsConfigFilePath: path.join(Deno.cwd(), "sample/tsconfig.json")
        compilerOptions: {
            declaration: false,
            emitDeclarationOnly: false,
            allowJs: true,
            target: ts.ScriptTarget.ES5,
            moduleResolution: ts.ModuleResolutionKind.Node10,
        }
    } as ProjectOptions;
    const prj = new Project(opts);
    prj.createSourceFile("code.ts", tsCode);

    return compileCode(prj);
}

const checkCode = (prj: Project) => {
    const checkResults = [] as string[];
    prj.getSourceFiles().forEach(sf => {
        for (const diagnostic of sf.getPreEmitDiagnostics())
            checkResults.push(`${diagnostic.getLineNumber()}:${diagnostic.getStart() || 0}-${diagnostic.getMessageText()}`); 
    });
    return checkResults;
}


function combineAndRemoveImportsExports(filePaths: string[]): string|undefined {
    const opts = { 
        //tsConfigFilePath: path.join(Deno.cwd(), "sample/tsconfig.json")
        compilerOptions: {
            declaration: false,
            emitDeclarationOnly: false,
            allowJs: true,
            target: ts.ScriptTarget.ES5,
            moduleResolution: ts.ModuleResolutionKind.Node10,
        }
    } as ProjectOptions;
    const prj = new Project(opts);
    filePaths.forEach(filePath => {
        prj.addSourceFileAtPath(filePath);
    });
    
    const tsCode = [] as string[];
    prj.getSourceFiles().forEach(sf => {
        tsCode.push("// " + sf.getFilePath());
        sf.getImportDeclarations().forEach(imp => {
            imp.replaceWithText("");
        });
        sf.getImportStringLiterals().forEach(imp => {
            imp.replaceWithText("");
        });
        // Exports
        sf.removeDefaultExport();
        sf.getInterfaces().forEach(i => {
            i.setIsExported(false);
        });
        sf.getClasses().forEach(i => {
            i.setIsExported(false);
        });
        sf.getEnums().forEach(i => {
            i.setIsExported(false);
        });
        sf.getFunctions().forEach(i => {
            i.setIsExported(false);
        });
        sf.getModules().forEach(i => {
            i.setIsExported(false);
        });
        sf.getTypeAliases().forEach(i => {
            i.setIsExported(false);
        });
        sf.getVariableStatements().forEach(i => {
            i.setIsExported(false);
        });

        tsCode.push(sf.getFullText());
    });
    return tsCode.join("\n");
}

function compileCode(prj: Project): tscResult {
    prj.enableLogging(true);

    const errors = checkCode(prj)
    const result = [] as string[];
    if(errors.length === 0) {
        prj.getSourceFiles().forEach(sf => {
            const sfemit = sf.getEmitOutput();
            
            sfemit.getOutputFiles().forEach(f => {
                result.push("// " + f.getFilePath());
                const t = f.getText();
                t && result.push(t);
            });
        });
    }

    return {
        success: errors.length === 0,
        errors,
        jsCode: result.join("\n")
    };
}
