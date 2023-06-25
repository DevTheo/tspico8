import { pico8Palette } from "./constants.ts";
import { pngs } from "./deps.ts";
import { logSuccess } from "./logging.ts";

const spritesheetWidth = 128;
const spritesheetHeight = 128;
const hexBase = 16;
const pixelDataSize = 3; // red + green + blue + alpha

const toClosestColor = (pixels: Uint8Array) => (_: unknown, offset: number) => {
  const pixelOffset = offset * pixelDataSize;
  const pixel = {
    r: pixels[pixelOffset],
    g: pixels[pixelOffset + 1],
    b: pixels[pixelOffset + 2] // eslint-disable-line no-magic-numbers
    //a: pixels[pixelOffset + 3]
  };

  let minDistance = Number.MAX_VALUE;
  let closestPaletteColor = 0;
  pico8Palette.forEach((color, i) => {
    const diff = (color.r - pixel.r) ** 2 + (color.g - pixel.g) ** 2 + (color.b - pixel.b) ** 2; // eslint-disable-line no-magic-numbers

    if (diff < minDistance) {
      minDistance = diff;
      closestPaletteColor = i;
    }
  });

  return closestPaletteColor.toString(hexBase);
};

export async function getSpritesheetFromImage (imagePath: string) {
  if (!imagePath) {
    throw new Error("Image path is missing");
  }
    
  const fileData = await Deno.readFile(imagePath); 
  const png = pngs.decode(fileData)
  logSuccess("Image parsed");
  if (png.width !== spritesheetWidth || png.height !== spritesheetHeight) {
    throw new Error("The spritesheet must be a 128x128 png image");
  }
  const pixels = new Array(png.width * png.height)
    .fill(0)
    .map(toClosestColor(png.image));

  const pixelsAsString = new Array(png.height)
    .fill(0)
    .map((_, offset) => pixels.slice(offset * spritesheetWidth, offset * spritesheetWidth + spritesheetWidth).join("")) // cut the strings so we get stacks of 128 characters
    .join("\n");

    return pixelsAsString;
    // const png = new pngjs.PNG({});
    // png.write(Deno.readFileSync(imagePath));
    // png.on("parsed", () => {
    //   logSuccess("Image parsed");
    //   if (png.width !== spritesheetWidth || png.height !== spritesheetHeight) {
    //     throw new Error("The spritesheet must be a 128x128 png image");
    //   }

    //   const pixels = new Array(png.width * png.height)
    //     .fill(0)
    //     .map(toClosestColor(png.data));

    //   const pixelsAsString = new Array(png.height)
    //     .fill(0)
    //     .map((_, offset) => pixels.slice(offset * spritesheetWidth, offset * spritesheetWidth + spritesheetWidth).join("")) // cut the strings so we get stacks of 128 characters
    //     .join("\n");

    //   resolve(pixelsAsString);
     //Deno.readFileSync(imagePath)

}
