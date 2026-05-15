type JsonLdProps = { data: unknown };

export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data injection
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
