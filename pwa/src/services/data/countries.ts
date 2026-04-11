import type { CountriesByCountryPayload, CountryDatasetCountry } from "@/types";

const COUNTRIES_STORAGE_KEY = "asaje.countries-and-cities.v1";

let countriesPayloadCache: CountriesByCountryPayload | null = null;
let countriesPayloadPromise: Promise<CountriesByCountryPayload> | null = null;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredCountriesPayload() {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(COUNTRIES_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CountriesByCountryPayload;
  } catch {
    return null;
  }
}

function writeStoredCountriesPayload(payload: CountriesByCountryPayload) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(COUNTRIES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

async function fetchCountriesPayload() {
  const response = await fetch("/data/cities-by-country.json");
  if (!response.ok) {
    throw new Error(`Unable to load countries dataset: ${response.status}`);
  }

  const payload = (await response.json()) as CountriesByCountryPayload;
  countriesPayloadCache = payload;
  writeStoredCountriesPayload(payload);
  return payload;
}

function getCachedCountriesPayload() {
  if (countriesPayloadCache) {
    return countriesPayloadCache;
  }

  const storedPayload = readStoredCountriesPayload();
  if (storedPayload) {
    countriesPayloadCache = storedPayload;
    return storedPayload;
  }

  return null;
}

export function preloadCountriesPayload() {
  const cachedPayload = getCachedCountriesPayload();
  if (cachedPayload) {
    return Promise.resolve(cachedPayload);
  }

  if (!countriesPayloadPromise) {
    countriesPayloadPromise = fetchCountriesPayload().finally(() => {
      countriesPayloadPromise = null;
    });
  }

  return countriesPayloadPromise;
}

export async function loadCountriesPayload() {
  const cachedPayload = getCachedCountriesPayload();
  if (cachedPayload) {
    return cachedPayload;
  }

  return preloadCountriesPayload();
}

export async function listCountries() {
  const payload = await loadCountriesPayload();
  return payload.countries;
}

export async function getCountryById(countryId: string | null | undefined) {
  if (!countryId) {
    return null;
  }

  const countries = await listCountries();
  return countries.find((country) => country.id === countryId) || null;
}

export async function getCountryByIsoCode(isoCode: string | null | undefined) {
  const normalizedCode = String(isoCode || "").trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const countries = await listCountries();
  return countries.find((country) => country.isoCode === normalizedCode) || null;
}

export function formatCountryLabel(country: CountryDatasetCountry) {
  const dialCode = country.dialCode ? ` (${country.dialCode})` : "";
  return `${country.flag} ${country.nameEn}${dialCode}`;
}
