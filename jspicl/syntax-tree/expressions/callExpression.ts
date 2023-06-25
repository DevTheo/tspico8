import {getPolyfilledCallExpression} from "../../polyfills/get-polyfilled-call-expression.ts";
import {FunctionExpression} from "./functionExpression.ts";
import {wrapWithParantheses} from "../../helpers/index.ts";
import {AstNodeParser} from "../../types.ts";

// http://esprima.readthedocs.io/en/latest/syntax-tree-format.html#call-and-new-expressions
export const CallExpression: AstNodeParser = (
  {callee, arguments: args},
  {transpile}
) => {
  const argumentList = transpile(args, {arraySeparator: ", "});

  // Is it a function inside an object?
  if (callee.object) {
    return getPolyfilledCallExpression({transpile, callee, argumentList});
  }

  // Regular function call
  const calleeExpression = wrapWithParantheses(
    callee.type === FunctionExpression.name,
    transpile(callee)
  );
  return `${calleeExpression}(${argumentList})`;
};
