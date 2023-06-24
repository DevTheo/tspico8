import chai from "https://cdn.skypack.dev/chai@4.3.4?dts";
export const describe = async (description: string, tests: () => void | Promise<void>) => {
    console.log(`${description}:`);
    const voidOrPromise: any = tests();
    if (voidOrPromise instanceof Promise) {
        await voidOrPromise;
    }
};

export const it = async (description: string, test: () => void | Promise<void>) => {
    const voidOrPromise: any = Deno.test(`  ${description}:`, test);
    if (voidOrPromise instanceof Promise) {
        await voidOrPromise;
    }
}
export const assert = chai.assert;
export const expect = chai.expect;
