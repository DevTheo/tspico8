import {TranspileFunction} from "../types.ts";
import {arrayPolyfillMap, genericPolyfillMap} from "./constants.ts";

type CallExpressionArguments = {
  transpile: TranspileFunction;
  // deno-lint-ignore no-explicit-any
  callee: any;
  argumentList?: string;
};

export function getPolyfilledCallExpression(args: CallExpressionArguments) {
  const {transpile, callee, argumentList = ""} = args;

  const callExpression = transpile(callee);
  const context = transpile(callee.object);
  const functionName = transpile(callee.property);

  // deno-lint-ignore no-prototype-builtins
  if (genericPolyfillMap.hasOwnProperty(callExpression)) {
    return genericPolyfillMap[callExpression](argumentList);
  }

  if (
    context &&
    functionName &&
    // deno-lint-ignore no-prototype-builtins
    arrayPolyfillMap.hasOwnProperty(functionName)
  ) {
    return arrayPolyfillMap[functionName](context, argumentList);
  }

  return `${callExpression}(${argumentList})`;
}
