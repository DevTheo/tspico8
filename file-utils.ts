import {path} from "./deps.ts";

const utf8Decoder = new TextDecoder("utf-8");
const utf8Encoder = new TextEncoder();

export const getFullPathSync = (sysPath: string) => {
    return path.join(Deno.realPathSync(path.dirname(sysPath)), path.basename(sysPath));
}
  
export const existsSync = (sysPath: string) => {
    let result = false;
    try {
      const info = Deno.statSync(sysPath);
      result = (info.isDirectory || info.size > 0);
      console.log(sysPath, result);
    } catch (err) {
      // ignoring
      console.log(`existsSync ignored: ${err.message}`);
    }
    return result;
}

export const readFileSync = (filePath: string, decoder?: TextDecoder): string => { 
    return (decoder || utf8Decoder).decode(Deno.readFileSync(filePath));
}

export const writeFileSync = (filePath: string, data: string): void => {
    Deno.writeFileSync(filePath, utf8Encoder.encode(data));
}
    
export const walkFolder = (dir: string): string[] => {
    const result = [] as Array<string>;
    const files = Deno.readDirSync(dir);
    for (const file of files) {
      if (file.isDirectory) {
        result.push(...walkFolder(path.join(dir, file.name)));
      } else {
        result.push(path.join(dir, file.name));
      }
    }
    return result;
}