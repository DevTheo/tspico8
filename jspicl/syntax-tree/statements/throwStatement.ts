import {AstNodeParser} from "../../types.ts";

// https://esprima.readthedocs.io/en/latest/syntax-tree-format.html#throw-statement
export const ThrowStatement: AstNodeParser = ({argument}, {transpile}) => {
  const transpiledArgument = transpile(argument)
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"');

  return `assert(false, "${transpiledArgument}")`;
};
