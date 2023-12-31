// deno-lint-ignore-file no-explicit-any
import createScope from "./scope.ts";

export type TranspileParams = {
  mappers: any;
  scope : any;
  decoratedTranspile: any;
} 

const transpile = ({ mappers, scope, decoratedTranspile }: TranspileParams, node: any, { arraySeparator = "\n" } = {}) =>
  (Array.isArray(node) ? node : [node])
    .filter(node => node)
    .map(node => {
      // Attempt to find the specific declaration, expression or statement
      const mapper = mappers[node.type];
      if (!mapper) {
        throw new Error(`\x1b[41m\x1b[37mThere is no handler for ${node.type}\x1b[0m`);
      }

      const result = mapper(node, {
        transpile: decoratedTranspile,
        scope: mapper.scopeBoundary ? scope.push() : scope.get()
      }) || "";

      mapper.scopeBoundary && scope.pop();

      return result;
    })
    .join(arraySeparator); // eslint-disable-line no-use-before-define

export default function createTranspiler ({ mappers = {}, initialScopeData } = {} as any) {
  const config = {
    scope: createScope(initialScopeData),
    mappers
  } as any;

  return (config.decoratedTranspile = transpile.bind(null, config));
}
