import { JspiclPluginOptions, banner } from "./constants.ts";
import { jspicl } from "./deps.ts";

export function transpile (javascriptCode: string, options: JspiclPluginOptions) {
  const { includeBanner, polyfillTransform, jspicl: jspiclOptions = {} } = options;
  const jspiclBanner = includeBanner && `${banner}` || "";

  const { code, polyfills } = jspicl.jspicl(javascriptCode, jspiclOptions);
  const polyfillOutput = polyfillTransform ? polyfillTransform(polyfills) : Object.values(polyfills).join("\n");
  const lua = `${polyfillOutput}${code}`;

  return {
    lua,
    polyfillOutput,
    toString () {
      return `${jspiclBanner}${lua}`;
    }
  };
}
