import Constants from 'expo-constants';

// Helper to calculate string similarity (percentage)
function stringSimilarity(a: string, b: string): number {
  a = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  b = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a || !b) return 0;
  if (a === b) return 100;
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return Math.round((matches / Math.max(a.length, b.length)) * 100);
}

export async function fetchLogoDevUrl(name: string, googleVerifiedName?: string): Promise<string | null> {
  if (googleVerifiedName && stringSimilarity(name, googleVerifiedName) < 70) {
    return null; // Names are not similar enough, do not fetch logo
  }
  const LOGODEV_API_KEY = Constants?.expoConfig?.extra?.LOGODEV_API_KEY || '';
  if (!LOGODEV_API_KEY) {
    return '';
  }
  const url = `https://api.logo.dev/search?q=${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${LOGODEV_API_KEY}`
      }
    });
    if (!res.ok) {
      return '';
    }
    const data = await res.json();
    // Crop the full API response log for clarity
    const croppedData = Array.isArray(data) ? data.slice(0, 2) : (data.logos ? data.logos.slice(0, 2) : []);
    // Only accept a logo if the result's name is at least 40% similar to the Google-verified name
    let logoUrl = '';
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        const sim = googleVerifiedName ? stringSimilarity(item.name, googleVerifiedName) : 0;
      });
      const match = data.find((item: any) =>
        googleVerifiedName && stringSimilarity(item.name, googleVerifiedName) >= 40 && item.logo_url
      );
      if (match) logoUrl = match.logo_url;
    } else if (data.logos?.length) {
      data.logos.forEach((item: any) => {
        const sim = googleVerifiedName ? stringSimilarity(item.name, googleVerifiedName) : 0;
      });
      const match = data.logos.find((item: any) =>
        googleVerifiedName && stringSimilarity(item.name, googleVerifiedName) >= 40 && item.image
      );
      if (match) logoUrl = match.image;
    }
    return logoUrl || null;
  } catch (err) {
    return '';
  }
} 