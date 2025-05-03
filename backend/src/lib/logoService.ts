import fetch from 'node-fetch';

export async function fetchLogoUrl(name: string): Promise<string | null> {
  const apiKey = process.env.LOGODEV_API_KEY;
  if (!apiKey) {
    console.error('LOGODEV_API_KEY is not set in environment variables.');
    return null;
  }
  const url = `https://api.logo.dev/search?q=${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer: ${apiKey}` }
    });
    if (!res.ok) {
      console.error('logo.dev API error:', res.status, res.statusText);
      return null;
    }
    const data: any = await res.json();
    // The new API returns an array of logo objects
    return data[0]?.logo_url || null;
  } catch (err) {
    console.error('Error fetching logo from logo.dev:', err);
    return null;
  }
} 