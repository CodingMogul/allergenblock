/**
 * Calculates similarity between two strings using Levenshtein distance
 * @param str1 - First string
 * @param str2 - Second string
 * @returns number between 0 (no similarity) and 1 (exact match)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
  
    if (s1 === s2) return 1;
    if (!s1 || !s2) return 0;
  
    const track = Array(s2.length + 1).fill(null).map(() =>
      Array(s1.length + 1).fill(null)
    );
  
    for (let i = 0; i <= s1.length; i++) track[0][i] = i;
    for (let j = 0; j <= s2.length; j++) track[j][0] = j;
  
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + cost
        );
      }
    }
  
    const distance = track[s2.length][s1.length];
    const maxLen = Math.max(s1.length, s2.length);
    return 1 - distance / maxLen;
  }
  
/**
 * Calculates the distance between two coordinates in meters using the Haversine formula
 * @param coord1 First coordinate {lat, lng}
 * @param coord2 Second coordinate {lat, lng}
 * @returns Distance in meters
 */
export function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
  