// deno-lint-ignore-file ban-types
import * as globalMappers from "./syntax-tree/index.ts";
import {createTranspiler} from "./deps.ts"

export function createJspiclTranspiler(
  customMappers?: Object,
  initialScopeData?: Object
) {
  return createTranspiler({
    initialScopeData,
    mappers: {
      ...globalMappers,
      ...customMappers
    }
  });
}