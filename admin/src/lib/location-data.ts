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

let payloadCache: CountriesByCountryPayload | null = null;
let payloadPromise: Promise<CountriesByCountryPayload> | null = null;

async function fetchPayload() {
  const response = await fetch("/data/cities-by-country.json");
  if (!response.ok) {
    throw new Error(`Unable to load countries dataset: ${response.status}`);
  }

  payloadCache = (await response.json()) as CountriesByCountryPayload;
  return payloadCache;
}

export async function loadCountriesPayload() {
  if (payloadCache) {
    return payloadCache;
  }

  if (!payloadPromise) {
    payloadPromise = fetchPayload().finally(() => {
      payloadPromise = null;
    });
  }

  return payloadPromise;
}

export async function listCountries() {
  const payload = await loadCountriesPayload();
  return payload.countries;
}

export async function getCitiesByCountryId(countryId: string | null | undefined) {
  if (!countryId) {
    return [];
  }

  const countries = await listCountries();
  return countries.find((country) => country.id === countryId)?.cities || [];
}

export async function getCountryById(countryId: string | null | undefined) {
  if (!countryId) {
    return null;
  }

  const countries = await listCountries();
  return countries.find((country) => country.id === countryId) || null;
}

export async function getCountryByDialCode(phoneNumber: string | null | undefined) {
  const normalized = String(phoneNumber || "").trim();
  if (!normalized.startsWith("+")) {
    return null;
  }

  const countries = await listCountries();
  return [...countries]
    .filter((country) => country.dialCode && normalized.startsWith(country.dialCode))
    .sort((left, right) => right.dialCode.length - left.dialCode.length)[0] || null;
}
