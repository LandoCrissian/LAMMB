import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // Review prototypes keep their page-level noindex/nofollow. Crawlers must
  // still retrieve HTML to observe those directives and public card images.
  return { rules: { userAgent: '*', allow: '/' } };
}
