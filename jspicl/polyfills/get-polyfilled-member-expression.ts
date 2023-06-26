import {TranspileFunction} from "../types.ts";
import {arrayPolyfillMap} from "./constants.ts";

type MemberExpressionArgument = {
  transpile: TranspileFunction;
  computed: boolean;
  // deno-lint-ignore no-explicit-any
  object: any;
  // deno-lint-ignore no-explicit-any
  property: any;
};

export function getPolyfilledMemberExpression({
  transpile,
  computed,
  object,
  property
}: MemberExpressionArgument) {
  const objectName = transpile(object);
  const propertyName = transpile(property);

  // TODO: Check metadata to determine where to look for the polyfill
  // deno-lint-ignore no-prototype-builtins
  if (arrayPolyfillMap.hasOwnProperty(propertyName)) {
    return arrayPolyfillMap[propertyName](objectName, "");
  }

  return computed
    ? `${objectName}[${propertyName}]`
    : `${objectName}.${propertyName}`;
}
