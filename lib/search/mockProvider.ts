import { SearchProvider, SearchResult } from "./provider";

export class MockSearchProvider implements SearchProvider {
  private stubs: Array<{ match: string; results: SearchResult[] }> = [];
  public calls: string[] = [];

  stub(matchSubstring: string, results: SearchResult[]): void {
    this.stubs.push({ match: matchSubstring, results });
  }

  async search(query: string): Promise<SearchResult[]> {
    this.calls.push(query);
    const found = this.stubs.find((s) => query.includes(s.match));
    if (found) return found.results;
    // Unlike MockAIProvider, default to empty results rather than
    // throwing — a pillar search legitimately can return nothing, and
    // the pipeline needs to handle that without every test needing a
    // stub for every pillar it doesn't care about.
    return [];
  }
}
