import {FunctionExpression} from "../expressions/index.ts";
import {wrapWithParantheses} from "../../helpers/index.ts";
import {AstNodeParser} from "../../types.ts";

// http://esprima.readthedocs.io/en/latest/syntax-tree-format.html#expression-statement
export const ExpressionStatement: AstNodeParser = (
  {expression, directive},
  {transpile}
) =>
  !directive
    ? wrapWithParantheses(
        expression.type === FunctionExpression.name,
        transpile(expression)
      )
    : "";
