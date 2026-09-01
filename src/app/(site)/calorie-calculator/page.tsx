import type { Metadata } from "next";
import { CalorieCalculatorPageClient } from "@/components/tools/CalorieCalculatorPageClient";
import { CalorieCalculatorSeoContent } from "@/components/tools/CalorieCalculatorSeoContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { loadPublicCatalogForServer } from "@/lib/profiles/fetch-approved-catalog-server";
import {
  buildCalorieCalculatorJsonLd,
  buildCalorieCalculatorMetadata,
} from "@/lib/seo/calorie-calculator-seo";

export const metadata: Metadata = buildCalorieCalculatorMetadata();

export default async function CalorieCalculatorPage() {
  const { trainers, mode } = await loadPublicCatalogForServer();
  const jsonLd = buildCalorieCalculatorJsonLd();

  return (
    <>
      {jsonLd.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}
      <CalorieCalculatorPageClient
        initialCatalog={trainers}
        catalogMode={mode}
      />
      <CalorieCalculatorSeoContent />
    </>
  );
}
