import { FOUNDATION_PERMISSION_DECLARATIONS } from "../foundation/permissions.ts";

const categoryFor = (tableId: string): string => {
  if (/meal|food|nutrition/.test(tableId)) return "Nutrition and meal history";
  if (/workout|exercise|muscle/.test(tableId)) return "Training";
  if (/health/.test(tableId)) return "Health and activity summaries";
  if (/device|watch|sync/.test(tableId)) return "Devices and synchronization";
  if (/profile|goal|preference|onboarding|consent/.test(tableId)) return "Profile and preferences";
  if (/report|progress|recommendation|action/.test(tableId)) return "Progress and recommendations";
  if (/subscription|entitlement|purchase/.test(tableId)) return "Billing and entitlements";
  if (/support|notification/.test(tableId)) return "Support and notifications";
  return "Account operations";
};

export function privacyInventory() {
  const grouped = new Map<string, string[]>();
  for (const declaration of Object.values(FOUNDATION_PERMISSION_DECLARATIONS)) {
    if (declaration.ownerField !== "userId") continue;
    const category = categoryFor(declaration.tableId);
    grouped.set(category, [...(grouped.get(category) ?? []), declaration.tableId]);
  }
  return {
    policyVersion: "privacy-inventory-v1",
    rawMealImagesInAnalytics: false,
    rawHealthPayloadsInAnalytics: false,
    modelImprovementRequiresSeparateConsent: true,
    categories: [...grouped.entries()].map(([name, tables]) => ({ name, tables: tables.sort() })),
  };
}
