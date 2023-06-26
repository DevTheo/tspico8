import {normalizeName} from "../../helpers/index.ts";
import {AstNodeParser} from "../../types.ts";

const specialCases: Record<string, string> = {
  undefined: "nil"
};

// http://esprima.readthedocs.io/en/latest/syntax-tree-format.html#identifier
export const Identifier: AstNodeParser = ({name, value}) => {
  const identifier = normalizeName(value || name);

  return (
    // deno-lint-ignore no-prototype-builtins
    (specialCases.hasOwnProperty(identifier) && specialCases[identifier]) ||
    identifier
  );
};
