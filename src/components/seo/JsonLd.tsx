interface JsonLdProps {
  data: Record<string, unknown>;
}

/** Server-safe structured data for rich search results. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
