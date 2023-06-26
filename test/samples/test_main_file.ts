import { alwaysTrue } from "./test_module.ts";

export enum SimpleEnum {
    One, Two
}

export class SimpleClass {
myVar: boolean;
    constructor() {
        this.myVar = alwaysTrue();
    }
} 

export const simpleClass = new SimpleClass();

