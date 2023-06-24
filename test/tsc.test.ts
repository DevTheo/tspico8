import { tscSync } from "../tsc.ts";
import {describe, it, expect} from './bdd.ts';
import * as path from "https://deno.land/std@0.184.0/path/mod.ts";

describe('tscSync', () => {
    it('with files should work', () => {
        const tsFilePaths = [
            path.join(Deno.cwd(), 'samples/test_module.ts'),
            path.join(Deno.cwd(), 'samples/test_main_file.ts')];
        const result = tscSync({tsFilePaths, noModule: true});
        
        expect(result.success).to.be.equal(true);
        const data = Deno.readTextFileSync(path.join(Deno.cwd(), 'samples/no_module.js'));
        expect(result.jsCode).to.be.equal(data);
    });
});