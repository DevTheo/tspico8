export declare type JspiclOptions = {
  prettify?: boolean;
  customMappers?: Record<string, AstNodeParser>;
};

export declare type JspiclOutput = {
  code: string;
  polyfills: Record<string, string>;
};

export declare type AstNode = {
  type: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
};

export declare type TranspileOptions = {arraySeparator?: string};
export declare type TranspileFunction = (
  node: AstNode,
  options?: TranspileOptions
) => string;

export declare type AstNodeParserOptions = {
  transpile: TranspileFunction;
  scope: {
    // deno-lint-ignore no-explicit-any
    variables: Record<string, any>;
    // deno-lint-ignore no-explicit-any
    [key: string]: any;
  };
};

export declare type AstNodeParser = {
  (node: Omit<AstNode, "type">, options: AstNodeParserOptions): string;
  scopeBoundary?: boolean;
};
