export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  whatsAppPhone: string;
  notifyEmail: boolean;
  notifyInApp: boolean;
  notifyWhatsapp: boolean;
}

export interface CountryDatasetCountry {
  cities: string[];
  dialCode: string;
  flag: string;
  id: string;
  isoCode: string;
  nameEn: string;
  nameFr: string;
}

export interface CountriesByCountryPayload {
  countries: CountryDatasetCountry[];
  countryCount: number;
  generatedAt: string;
  seededCountryCount?: number;
  source: string;
  supplements?: string[];
}

export interface PaginatedResponse<TItem> {
  items: TItem[];
  meta: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}
