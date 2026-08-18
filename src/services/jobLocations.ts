export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  presetCities: string[];
}

export const SUPPORTED_ADZUNA_COUNTRIES: CountryOption[] = [
  {
    code: 'br',
    name: 'Brasil',
    flag: '🇧🇷',
    presetCities: [
      'Remoto / Brasil',
      'São Paulo',
      'Rio de Janeiro',
      'Curitiba',
      'Belo Horizonte',
      'Florianópolis',
      'Porto Alegre',
      'Campinas',
      'Brasília',
      'Recife',
    ],
  },
  {
    code: 'us',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    presetCities: [
      'Remote',
      'New York',
      'San Francisco',
      'Austin',
      'Seattle',
      'Chicago',
      'Boston',
      'Los Angeles',
    ],
  },
  {
    code: 'gb',
    name: 'Reino Unido',
    flag: '🇬🇧',
    presetCities: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Bristol', 'Cambridge'],
  },
  {
    code: 'ca',
    name: 'Canadá',
    flag: '🇨🇦',
    presetCities: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary'],
  },
  {
    code: 'de',
    name: 'Alemanha',
    flag: '🇩🇪',
    presetCities: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne'],
  },
  {
    code: 'fr',
    name: 'França',
    flag: '🇫🇷',
    presetCities: ['Paris', 'Lyon', 'Toulouse', 'Nantes', 'Marseille'],
  },
  {
    code: 'es',
    name: 'Espanha',
    flag: '🇪🇸',
    presetCities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Malaga'],
  },
  {
    code: 'au',
    name: 'Austrália',
    flag: '🇦🇺',
    presetCities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  },
  {
    code: 'nl',
    name: 'Holanda',
    flag: '🇳🇱',
    presetCities: ['Amsterdam', 'Rotterdam', 'Utrecht', 'The Hague'],
  },
  {
    code: 'it',
    name: 'Itália',
    flag: '🇮🇹',
    presetCities: ['Milan', 'Rome', 'Turin'],
  },
  {
    code: 'sg',
    name: 'Singapura',
    flag: '🇸🇬',
    presetCities: ['Singapore', 'Central Area'],
  },
  {
    code: 'in',
    name: 'Índia',
    flag: '🇮🇳',
    presetCities: ['Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Delhi'],
  },
  {
    code: 'pl',
    name: 'Polônia',
    flag: '🇵🇱',
    presetCities: ['Warsaw', 'Krakow', 'Wroclaw'],
  },
  {
    code: 'mx',
    name: 'México',
    flag: '🇲🇽',
    presetCities: ['Ciudad de México', 'Guadalajara', 'Monterrey'],
  },
];

export interface FavoriteLocation {
  id: string;
  countryCode: string;
  name: string;
  createdAt: string;
}

export const LOCAL_STORAGE_FAVORITE_LOCATIONS_KEY = 'job_hunter_favorite_locations_v1';
export const LOCAL_STORAGE_SELECTED_COUNTRY_KEY = 'job_hunter_selected_country_v1';

export function getStoredFavoriteLocations(): FavoriteLocation[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FAVORITE_LOCATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading favorite locations from localStorage:', err);
    return [];
  }
}

export function saveFavoriteLocations(favorites: FavoriteLocation[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_FAVORITE_LOCATIONS_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.error('Error saving favorite locations to localStorage:', err);
  }
}

export function addFavoriteLocation(name: string, countryCode: string = 'br'): FavoriteLocation[] {
  const cleanName = name.trim();
  if (!cleanName) return getStoredFavoriteLocations();

  const current = getStoredFavoriteLocations();
  const exists = current.some(
    (f) => f.name.toLowerCase() === cleanName.toLowerCase() && f.countryCode === countryCode
  );
  if (exists) return current;

  const newItem: FavoriteLocation = {
    id: `fav-loc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    countryCode,
    name: cleanName,
    createdAt: new Date().toISOString(),
  };

  const updated = [newItem, ...current];
  saveFavoriteLocations(updated);
  return updated;
}

export function removeFavoriteLocation(id: string): FavoriteLocation[] {
  const current = getStoredFavoriteLocations();
  const updated = current.filter((f) => f.id !== id);
  saveFavoriteLocations(updated);
  return updated;
}

export function getStoredSelectedCountry(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'br';
  }
  try {
    return localStorage.getItem(LOCAL_STORAGE_SELECTED_COUNTRY_KEY) || 'br';
  } catch {
    return 'br';
  }
}

export function saveSelectedCountry(code: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_SELECTED_COUNTRY_KEY, code.toLowerCase().trim());
  } catch {
    // ignore
  }
}
