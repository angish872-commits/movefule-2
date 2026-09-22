function configured(value: string | undefined): boolean {
  const normalized = value?.trim() ?? "";
  if (!normalized) return false;
  const upper = normalized.toUpperCase();
  return !upper.startsWith("REPLACE_") && upper !== "REPLACE_ME" && !upper.includes("PLACEHOLDER");
}

const checks = [
  ["APPWRITE_ENDPOINT", configured(process.env.APPWRITE_ENDPOINT), "required for real Appwrite sign-in/backend JWT validation"],
  ["APPWRITE_PROJECT_ID", configured(process.env.APPWRITE_PROJECT_ID), "required for real Appwrite sign-in/backend JWT validation"],
  ["APPWRITE_DATABASE_ID", configured(process.env.APPWRITE_DATABASE_ID), "required for TablesDB persistence"],
  ["OPENROUTER_API_KEY", configured(process.env.OPENROUTER_API_KEY), "preferred server-only credential for database-routed live meal-photo AI"],
  ["USDA_FDC_API_KEY", configured(process.env.USDA_FDC_API_KEY), "required for trusted FoodData Central calories and macros from recognized foods"],
  ["OPEN_FOOD_FACTS_USER_AGENT", configured(process.env.OPEN_FOOD_FACTS_USER_AGENT), "required for server-side Open Food Facts barcode lookups"],
  ["GEMINI_API_KEY", configured(process.env.GEMINI_API_KEY), "optional direct-provider fallback for live meal-photo AI"],
  ["APPWRITE_API_KEY", configured(process.env.APPWRITE_API_KEY), "required with BUCKET_MEAL_MEDIA_ID for production private meal-media persistence"],
  ["BUCKET_MEAL_MEDIA_ID", configured(process.env.BUCKET_MEAL_MEDIA_ID), "required with APPWRITE_API_KEY for production private meal-media persistence"],
] as const;

console.log("MoveFuel private configuration check (values are never printed):");
for (const [name, ok, purpose] of checks) {
  console.log(`${ok ? "OK" : "MISSING"}  ${name} — ${purpose}`);
}

const required = checks.slice(0, 3);
const productionMediaRequired = process.env.MOVEFUEL_ENV?.trim() === "production";
if (required.some(([, ok]) => !ok) || (productionMediaRequired && checks.slice(-2).some(([, ok]) => !ok))) process.exitCode = 2;
