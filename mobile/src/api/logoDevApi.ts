import Constants from 'expo-constants';

export async function fetchLogoDevUrl(name: string): Promise<string> {
  const LOGODEV_API_KEY = Constants?.expoConfig?.extra?.LOGODEV_API_KEY || '';
  if (!LOGODEV_API_KEY) return '';
  const url = `https://api.logo.dev/search?q=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${LOGODEV_API_KEY}`
    }
  });
  if (!res.ok) return '';
  const data = await res.json();
  // Return the first logo image URL if available
  return data.logos?.[0]?.image || '';
} 