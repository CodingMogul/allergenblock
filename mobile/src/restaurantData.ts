// All restaurant-related types for local storage and app logic

export interface MenuItem {
  id?: string; // optional for flexibility
  name: string;
  allergenIngredients: Record<string, string[]>;
}

export interface GooglePlace {
  name: string;
  location: { lat: number; lng: number };
  icon?: string;
}

export interface Restaurant {
  id: string;
  restaurantName: string;
  verifiedName?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  verifiedLocation?: { lat: number; lng: number };
  menuItems: MenuItem[];
  source?: string;
  apimatch?: string;
  googlePlace?: any;
  brandLogo?: string;
  updatedAt?: number;
  createdAt?: number;
  hidden?: boolean;
} 