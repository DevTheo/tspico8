import {normalizeName} from "../../helpers/index.ts";
import {AstNodeParser} from "../../types.ts";

// http://esprima.readthedocs.io/en/latest/syntax-tree-format.html#variable-declaration
export const VariableDeclarator: AstNodeParser = (
  {id, init},
  {scope, transpile}
) => {
  const {name} = id;
  const normalizedName = normalizeName(name);
  const value = transpile(init) || "nil";

  // Store variable metadata in the scope
  // for accessibility
  scope.variables[name] = {
    name: normalizedName
    // type:
  };

  return `local ${normalizedName} = ${value}`;
};
