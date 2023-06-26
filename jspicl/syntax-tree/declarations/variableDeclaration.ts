import {AstNodeParser} from "../../types.ts";

// http://esprima.readthedocs.io/en/latest/syntax-tree-format.html#variable-declaration
export const VariableDeclaration: AstNodeParser = (
  {declarations},
  {transpile}
) => transpile(declarations);
