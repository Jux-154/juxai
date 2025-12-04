import { Runware, type ITextToImage } from "@runware/sdk-js";

const runware = new Runware({ apiKey: "dgk5rP5fNTfVAEvjixKFRCTKB4dTc8XP" });

export async function generateFromText(prompt: string): Promise<string> {
  try {
    const [image] = await runware.requestImages({
      positivePrompt: prompt,
      width: 320,
      height: 320,
      numberResults: 1,
      model: "civitai:102438@133677"
    }) as ITextToImage[];

    return image.imageURL;
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image");
  }
}
