export type NullableProcess = Deno.ChildProcess | null;

export type execSyncParams = {
    args? : Array<string>;
    cwd? : string;
    encoding?: string;
  } 
  
 export const execSync = (exePath: string, {args, cwd} : execSyncParams) => {
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
  