import {AstNodeParser} from "../../types.ts";

// http://esprima.readthedocs.io/en/latest/syntax-tree-format.html#break-statement
export const BreakStatement: AstNodeParser = (_, {scope: {isInsideSwitch}}) =>
  isInsideSwitch ? "" : "break";
