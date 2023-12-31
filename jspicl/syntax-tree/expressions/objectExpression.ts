import {AstNodeParser} from "../../types.ts";

// http://esprima.readthedocs.io/en/latest/syntax-tree-format.html#object-expression
export const ObjectExpression: AstNodeParser = ({properties}, {transpile}) =>
  `{
    ${transpile(properties, {arraySeparator: ",\n"})}
  }`;
