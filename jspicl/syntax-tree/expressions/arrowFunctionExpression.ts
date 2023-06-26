import {AstNodeParser} from "../../types.ts";
import {FunctionDeclaration} from "../declarations/index.ts";

// http://esprima.readthedocs.io/en/latest/syntax-tree-format.html#arrow-function-expression
export const ArrowFunctionExpression: AstNodeParser = (...args) =>
  FunctionDeclaration(...args);

ArrowFunctionExpression.scopeBoundary = true;
