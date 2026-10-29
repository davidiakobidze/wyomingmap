// Structured data for search engines: schema.org JSON-LD in a script tag.
// "<" is escaped so no string in the data can close the tag.
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c") }}
    />
  );
}
