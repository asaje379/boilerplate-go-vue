import { getCountryById, getCountryByIsoCode, loadCountriesPayload } from "@/services/data/countries";

function normalizeCountryCode(countryCode: string | null | undefined) {
  return String(countryCode || "").trim().toUpperCase();
}

export async function getCitiesByCountryCode(countryCode: string | null | undefined) {
  const normalizedCode = normalizeCountryCode(countryCode);
  if (!normalizedCode) {
    return [];
  }

  const payload = await loadCountriesPayload();
  const country = payload.countries.find((item) => item.isoCode === normalizedCode);
  return country?.cities || [];
}

export async function getCitiesByCountryId(countryId: string | null | undefined) {
  const country = await getCountryById(countryId);
  return country?.cities || [];
}

export async function getDialCodeByCountryId(countryId: string | null | undefined) {
  const country = await getCountryById(countryId);
  return country?.dialCode || "";
}

export async function getDialCodeByCountryCode(countryCode: string | null | undefined) {
  const country = await getCountryByIsoCode(countryCode);
  return country?.dialCode || "";
}
