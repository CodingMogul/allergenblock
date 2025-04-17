import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from 'fs';
import path from 'path';

// Ensuring API key loads properly and initialization of AI model
if(!process.env.GEMINI_API_KEY){
    throw new Error("GEMINI_API_KEY not found in environment variables")
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({model:"gemini-1.5-flash"});

/**
 * Triggers camera request for menu capture
 * @param restaurantName - Name of the restaurant
 * @param location - Restaurant's coordinates
 * @returns Promise boolean of success or failure
 */
export async function requestCameraCapture(
  restaurantName: string,
  location: {lat: number, lng: number}
): Promise<boolean> {
  console.log('📸 Requesting menu capture for:', { restaurantName, location });
  // This would be where we would request the camera capture from the camera
  return true;
}

/**
 * Processes the captured image from the camera
 * @param imageData - The image data captured from the camera (can be a File, Blob, or base64 string)
 * @returns Processed menu items with source information
 */
export async function processCameraImage(
  imageData: string | { path: string }
): Promise<{
  menuItems: Array<{name: string, allergens: string[]}>;
  source: 'camera';
}> {
  console.log('🔍 Processing camera image');
  
  try {
    let base64Image: string;
    
    // Handle different types of image data
    if (typeof imageData === 'string') {
      // If it's already a base64 string
      if (imageData.startsWith('data:image')) {
        // If it's a data URL, extract the base64 part
        base64Image = imageData.split(',')[1];
      } else {
        // Assume it's already a base64 string
        base64Image = imageData;
      }
    } else if (imageData.path) {
      // If it's a file path
      base64Image = await convertToBase64(imageData.path);
    } else {
      throw new Error('Invalid image data format');
    }
    
    // Process the image with Gemini AI
    const menuItems = await processImageWithGemini(base64Image);
    
    // Return menu items with source information
    return {
      menuItems,
      source: 'camera' as const
    };
  } catch (error) {
    console.error('Error processing camera image:', error);
    return {
      menuItems: [],
      source: 'camera' as const
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
    
    console.log('Reading file from:', absolutePath);
    const fileBuffer = readFileSync(absolutePath);
    const base64String = fileBuffer.toString('base64');
    return base64String;
;
  } catch (error) {
    console.error('Error converting file to base64:', error);
    throw error;
  }
}

/**
 * Process image with Gemini AI to extract allergen information
 * @param base64Image - Base64 encoded image data
 * @returns Processed menu items with allergens
 */
export async function processImageWithGemini(base64Image: string) {
  try {
    if (!base64Image) throw new Error("No image provided");

    const response = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          {
            text: `You are analyzing an image of a restaurant menu.
                  Your job is to extract each **menu item** as an object with two fields:
                  1. "name": the name of the menu item  
                  2. "allergens": an array of allergens (like gluten, egg, soy, etc.)

                  Output must be a **valid JSON array** like:
                  [
                    {
                      "name": "Whopper",
                      "allergens": ["gluten", "soy", "egg"],
                      "certainty": 0.95
                    },
                    {
                      "name": "French Fries",
                      "allergens": [],
                      "certainty": 0.7
                    }
                  ]

                  Rules:
                  - If ingredients are visible, extract allergens from them and assign a high certainty
                  - If ingredients are not visible, use YOUR food knowledge of fast food items (like those from Burger King, McDonald's, Chick-fil-A) to infer allergens and assign a moderate certainty. Assign high certainty if very sure it includes those allergens.
                  - If you are unsure, assign a lower certainty
                  - DO NOT guess. Only use ingredients shown or well-known recipes of that restaurant.
                  - If you still can't infer allergens, return an empty array []
                  - Accuracy is critical for allergic individuals. Be as precise as possible.
                  - If there are any typos of general food items from the common restaurants then you can use your general knowledge to correct it (e.g. use "Hamburger" for Burger King if there's a processing error of "Hashburger" or "Hanburger")
                  - If a menu item is under a category like “Pizza”, “Burgers”, “Combos”, or “Country Dinners”, assume it inherits base ingredients typical of that category unless stated otherwise. For example, if a dish is under “BBQ” and contains pulled pork or ribs, assume BBQ sauce is used and may contain gluten.
                  - Do not treat menu items as standalone unless they appear outside a category.
                  - No markdown, no extra text — just raw JSON`,
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            }
          }
        ]
      }],
      // Adjusted models creativity settings to be more precise
      // and less creative, as this is a factual task
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
      }
    });

    // Extract Gemini response and parse the JSON data safely
    const rawText = await response.response.text();
    const cleanText = rawText.replace(/```json|```/g, '').trim();

    try {
      const allergenData = JSON.parse(cleanText);
      if (!allergenData) throw new Error("Could not generate json form of allergen");

      console.log(allergenData);
      return allergenData;
    }

    // Error if problem with JSON/file parsing
    catch (error) {
      console.log("Error in processing:", error);
      return {
        error: true,
        message: "Error in processing file"
      };
    }
  }

  // Error if problem with Gemini
  catch (error) {
    console.log("Error in Gemini", error);
    return {
      error: true,
      message: "Gemini failed"
    };
  }
}

/**
 * Validates the camera capture data
 * @param restaurantName - Name of the restaurant
 * @param location - Restaurant's coordinates
 * @param menuItems - Array of menu items with allergens
 * @returns Boolean indicating if the data is valid
 */
export function validateCameraData(
  restaurantName: string,
  location: {lat: number, lng: number},
  menuItems: Array<{name: string, allergens: string[]}>
): boolean {
  if (!restaurantName || !location || !menuItems) {
    console.error('❌ Invalid camera data: missing required fields');
    return false;
  }
  
  if (menuItems.length === 0) {
    console.error('❌ Invalid camera data: no menu items found');
    return false;
  }
  
  return true;
} 