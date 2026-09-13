import { SearchProvider, SearchProviderError, SearchResult } from "./provider";

const SERPER_API_URL = "https://google.serper.dev/search";

interface SerperResponseItem {
  title: string;
  link: string;
  snippet?: string;
}

/**
 * Uses Serper.dev (a Google Search results API) — picked over scraping
 * Google directly or using a heavier SDK because it's a single API key
 * and a plain JSON POST, which keeps this swappable behind
 * SearchProvider without pulling in a vendor SDK. Get a key at
 * serper.dev; the free tier is enough for MVP development.
 */
export class SerperSearchProvider implements SearchProvider {
  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new SearchProviderError(
        "SerperSearchProvider requires an API key. Set SERPER_API_KEY."
      );
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    let response: Response;
    try {
      response = await fetch(SERPER_API_URL, {
        method: "POST",
        headers: {
          "X-API-KEY": this.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({ q: query, num: 8 }),
      });
    } catch (err) {
      throw new SearchProviderError("Network error calling Serper API", err);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "<unreadable body>");
      throw new SearchProviderError(`Serper API returned ${response.status}: ${body}`);
    }

    const data = (await response.json()) as { organic?: SerperResponseItem[] };

    return (data.organic ?? []).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet ?? "",
    }));
  }
}

let cached: SerperSearchProvider | null = null;

export function getSerperProvider(): SerperSearchProvider {
  if (!cached) {
    cached = new SerperSearchProvider(process.env.SERPER_API_KEY ?? "");
  }
  return cached;
}
