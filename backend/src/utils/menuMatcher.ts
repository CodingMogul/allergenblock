import { calculateStringSimilarity } from "./stringSimilarity";

/**
 * Finds the best matching menu items between two arrays of menu items
 * @param sourceItems - Array of source menu items
 * @param targetItems - Array of target menu items to match against
 * @returns Array of best matching menu items with similarity scores
 */
export function findBestMatchingMenu(
  sourceItems: Array<{ name: string; allergenIngredients: Record<string, string[]> }>,
  targetItems: Array<{ name: string; allergenIngredients: Record<string, string[]> }>
) {
  return sourceItems.map(sourceItem => {
    let bestMatch = null;
    let bestScore = 0;

    for (const targetItem of targetItems) {
      const similarity = calculateMenuItemSimilarity(sourceItem, targetItem);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = {
          sourceItem,
          targetItem,
          similarity
        };
      }
    }

    return bestMatch;
  }).filter(match => match !== null);
}

/**
 * Calculates similarity score between two menu items
 * @param item1 - First menu item
 * @param item2 - Second menu item
 * @returns Similarity score between 0 and 1
 */
export function calculateMenuItemSimilarity(
  item1: { name: string; allergenIngredients: Record<string, string[]> },
  item2: { name: string; allergenIngredients: Record<string, string[]> }
): number {
  // Calculate name similarity
  const nameSimilarity = calculateStringSimilarity(item1.name, item2.name);
  
  // Calculate allergen similarity based on allergen keys
  const allergenSet1 = new Set(Object.keys(item1.allergenIngredients));
  const allergenSet2 = new Set(Object.keys(item2.allergenIngredients));
  
  // Count matching allergens
  let matchingAllergens = 0;
  for (const allergen of allergenSet1) {
    if (allergenSet2.has(allergen)) {
      matchingAllergens++;
    }
  }
  
  // Calculate allergen similarity score
  const totalAllergens = new Set([...allergenSet1, ...allergenSet2]).size;
  const allergenSimilarity = totalAllergens > 0 ? matchingAllergens / totalAllergens : 1;
  
  // Combine scores (70% name, 30% allergens)
  return (nameSimilarity * 0.7) + (allergenSimilarity * 0.3);
} 