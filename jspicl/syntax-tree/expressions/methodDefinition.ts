import {AstNodeParser} from "../../types.ts";

// http://esprima.readthedocs.io/en/latest/syntax-tree-format.html#class-expression
export const MethodDefinition: AstNodeParser = ({key, value}, {transpile}) =>
  `${transpile(key)} = ${transpile(value)}`;
