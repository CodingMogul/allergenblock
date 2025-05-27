import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from "fs";
import path from "path";

// Ensuring API key loads properly and initialization of AI model
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not found in environment variables");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Processes the captured image from the camera
 * @param imageData - The image data captured from the camera (can be a File, Blob, or base64 string)
 * @returns Processed menu items with source information, or all-null object if no menu found
 */
export async function processCameraImage(
  imageData: string | { path: string }
): Promise<{
  restaurantName?: string | null;
  location?: unknown | null;
  menuItems: Array<{ name: string; allergens: string[]; allergenIngredients: Record<string, string[]> }> | null;
  source: "camera" | null;
}> {
  console.log("🔍 Processing camera image");

  try {
    let base64Image: string;

    // Handle different types of image data
    if (typeof imageData === "string") {
      // If it's already a base64 string
      if (imageData.startsWith("data:image")) {
        // If it's a data URL, extract the base64 part
        base64Image = imageData.split(",")[1];
      } else {
        // Assume it's already a base64 string
        base64Image = imageData;
      }
    } else if (imageData.path) {
      // If it's a file path
      base64Image = await convertToBase64(imageData.path);
    } else {
      throw new Error("Invalid image data format");
    }

    // Process the image with Gemini AI
    const result = await processImageWithGemini(base64Image);

    // Check if we got an error response
    if ("error" in result) {
      return {
        restaurantName: null,
        location: null,
        menuItems: null,
        source: null,
      };
    }

    // If no menu items found, return all-null object for no_menu handling
    if (!result || result.length === 0) {
      return {
        restaurantName: null,
        location: null,
        menuItems: null,
        source: null,
      };
    }

    // Return menu items with only name and allergenIngredients
    return {
      menuItems: result.map((item) => {
        // Normalize allergenIngredients to ensure all values are arrays of strings
        const normalizedAllergenIngredients: Record<string, string[]> = {};
        if (item.allergenIngredients && typeof item.allergenIngredients === 'object') {
          for (const key in item.allergenIngredients) {
            const val = item.allergenIngredients[key];
            if (Array.isArray(val)) {
              normalizedAllergenIngredients[key] = val.flat().map(String);
            } else if (typeof val === 'string') {
              normalizedAllergenIngredients[key] = [val];
            } else {
              normalizedAllergenIngredients[key] = [];
            }
          }
        }
        const allergens = Object.keys(normalizedAllergenIngredients);
        return {
          name: item.name,
          allergens,
          allergenIngredients: normalizedAllergenIngredients,
        };
      }),
      source: "camera" as const,
    };
  } catch (error) {
    console.error("Error processing camera image:", error);
    return {
      menuItems: [],
      source: "camera" as const,
    };
  }
}

/**
 * Converts a File or Blob to base64 string
 * @param filePath - The path to the file to convert
 * @returns Promise resolving to base64 string
 */
export async function convertToBase64(filePath: string): Promise<string> {
  try {
    // TESTESTEST
    // Convert to absolute path if it's not already
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    console.log("Reading file from:", absolutePath);
    const fileBuffer = readFileSync(absolutePath);
    const base64String = fileBuffer.toString("base64");
    return base64String;
  } catch (error) {
    console.error("Error converting file to base64:", error);
    throw error;
  }
}

/**
 * Process image with Gemini AI to extract allergen information
 * @param base64Image - Base64 encoded image data
 * @returns Processed menu items with allergens or error object
 */
export async function processImageWithGemini(
  base64Image: string | null
): Promise<
  | Array<{ name: string; allergens: string[]; allergenIngredients: Record<string, string[]> }>
  | { error: true; message: string }
> {
  try {
    if (!base64Image) {
      return {
        error: true,
        message: "No image provided",
      };
    }

    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are analyzing an image of a restaurant menu.\nYour job is to extract each **menu item** as an object with these fields:\n1. \"name\": the name of the menu item\n2. \"allergenIngredients\": an object mapping each allergen to the ingredient(s) that triggered it (e.g., { \"dairy\": [\"cheese\"], \"gluten\": [\"bun\"] }).\n3. Optionally, if you are making an educated guess about allergens based only on the menu item name (because no ingredients are listed), add a boolean field \"guessedAllergens\": true.\n4. \"certainty\": a number from 0 to 1 representing how confident you are in the allergen detection for this menu item (1 = absolutely certain, 0 = no confidence).\n\nIMPORTANT: Only consider these nine allergens: dairy, eggs, fish, shellfish, tree nuts, peanuts, gluten, soy, sesame. Only include these as keys in allergenIngredients.\n\nFor each menu item, map ingredients to these 9 allergens using the following rules:\n- dairy: cheese, milk, cream, butter, yogurt, sour cream, whey, casein, ghee, etc.\n- eggs: egg, eggs, mayonnaise, aioli, meringue, etc.\n- fish: salmon, tuna, cod, anchovy, haddock, etc.\n- shellfish: shrimp, crab, lobster, scallop, oyster, clam, mussel, etc.\n- tree nuts: almond, walnut, pecan, cashew, pistachio, hazelnut, macadamia, brazil nut, pine nut, etc.\n- peanuts: peanut, peanut butter, etc.\n- gluten: bread, bun, roll, wrap, tortilla, pita, bagel, brioche, sourdough, ciabatta, croissant, biscuit, English muffin, flour, wheat, barley, rye, etc.\n  (Bread, bun, roll, and similar baked goods always contain gluten unless specifically labeled gluten-free.)\n- soy: soy, soya, tofu, edamame, miso, tempeh, soy sauce, etc.\n- sesame: sesame, tahini, etc.\n\nRules:\n- For each allergen you include, list the specific ingredient(s) that triggered it.\n- If no ingredients are listed, make an educated guess about likely allergens based on the menu item name (e.g., \"Latte\" likely contains dairy, \"Cheese Toast\" contains dairy and gluten, \"Cakes\" contain gluten, eggs, and dairy, etc.).\n- If you are guessing, set \"guessedAllergens\": true in the output for that item.\n- For each menu item, always include a \"certainty\" field (0-1) representing your confidence in the allergen detection.\n- Only output the fields 'name', 'allergenIngredients', 'guessedAllergens' (if applicable), and 'certainty' for each menu item.\n- No markdown, no extra text — just raw JSON.\n\nExample output:\n[\n  {\n    \"name\": \"Cheeseburger\",\n    \"allergenIngredients\": {\n      \"dairy\": [\"cheese\"],\n      \"gluten\": [\"bun\"],\n      \"egg\": [\"mayo\"]\n    },\n    \"certainty\": 1\n  },\n  {\n    \"name\": \"Latte\",\n    \"allergenIngredients\": {\n      \"dairy\": [\"milk\"]\n    },\n    \"guessedAllergens\": true,\n    \"certainty\": 0.7\n  },\n  {\n    \"name\": \"Cakes\",\n    \"allergenIngredients\": {\n      \"gluten\": [\"flour\"],\n      \"dairy\": [\"milk\"],\n      \"eggs\": [\"egg\"]\n    },\n    \"guessedAllergens\": true,\n    \"certainty\": 0.8\n  }\n]`,
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 4096,
      },
    });

    // Extract Gemini response and parse the JSON data safely
    const rawText = await response.response.text();
    console.log('--- GEMINI RAW RESPONSE ---');
    console.log(rawText);
    const cleanText = rawText.replace(/```json|```/g, "").trim();
    console.log('--- GEMINI CLEANED TEXT ---');
    console.log(cleanText);

    try {
      const allergenData = JSON.parse(cleanText);
      console.log('--- GEMINI PARSED DATA ---');
      // Use JSON.stringify to show full nested arrays/objects
      console.log(JSON.stringify(allergenData, null, 2));
      if (Array.isArray(allergenData)) {
        allergenData.forEach((item, idx) => {
          if (!item.ingredients && !item.ingredientList) {
            console.warn(`Menu item at index ${idx} is missing ingredients/ingredientList:`, item);
          }
        });
      }
      if (!allergenData) {
        return {
          error: true,
          message: "Could not generate json form of allergen",
        };
      }

      return allergenData;
    } catch (error) {
      console.log("Error in processing:", error);
      return {
        error: true,
        message: "Error in processing file",
      };
    }
  } catch (error) {
    console.log("Error in Gemini", error);
    return {
      error: true,
      message: "Gemini failed",
    };
  }
}
