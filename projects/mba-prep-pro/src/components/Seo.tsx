import { Helmet } from "react-helmet-async";

const SITE_URL = "https://mbapreppro.com";
const SITE_NAME = "MBA Prep Pro";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

interface SeoProps {
  title: string;
  description: string;
  path: string;
  /** Extra JSON-LD to inject for this route (Article, FAQPage, etc.) */
  schema?: Record<string, unknown> | Record<string, unknown>[];
  image?: string;
  noindex?: boolean;
}

export const Seo = ({ title, description, path, schema, image, noindex }: SeoProps) => {
  const url = `${SITE_URL}${path}`;
  const ogImage = image ?? DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
};

export default Seo;
