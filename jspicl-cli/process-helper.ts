export type ProcessHelperOpts = {
    args?:Array<string> | undefined;
    shell?: boolean | undefined;
    cwd?: string | undefined;
    stdio?: 'pipe' | 'ignore' | 'inherit' | 'ignore'
}

export const execSync = (executablePath: string, args?:Array<string> | undefined) => {
    return spawn(executablePath, {stdio: "ignore", args}) as Deno.CommandOutput;
}

export const spawn = (executablePath: string, opts : ProcessHelperOpts) => {
    const args = opts?.args;
    const stdio = opts?.stdio || 'ignore';
    
    const cmd = new Deno.Command(executablePath, {args});

    if(stdio === 'inherit') {
        return cmd.outputSync();
    }
    
    return cmd.spawn().output();
}