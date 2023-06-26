import {normalizeName} from "../../helpers/index.ts";
import {AstNodeParser} from "../../types.ts";

// http://esprima.readthedocs.io/en/latest/syntax-tree-format.html#function-declaration
export const FunctionDeclaration: AstNodeParser = (
  {id, body, params},
  {transpile}
) => {
  const {name = ""} = id || {};
  const argumentList = transpile(params, {arraySeparator: ", "});
  const functionContent = transpile(body);

  return `function ${normalizeName(name)}(${argumentList})
    ${functionContent}
  end`;
};

FunctionDeclaration.scopeBoundary = true;
