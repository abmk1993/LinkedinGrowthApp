import { describe, expect, it } from "vitest";
import { generatePost, type ContentAgentInput } from "@/lib/ai/agents/contentAgent";
import type { AIProvider } from "@/lib/ai/provider";

const INPUT: ContentAgentInput = {
  profession: "QA Automation Engineer",
  pillars: ["Playwright"],
  contentStyle: "practical",
  careerGoal: "Be visible",
  topic: "Trace viewer",
  whyItMatters: "Faster debugging",
  whyYou: "You run Playwright",
  suggestedAngle: "Your take on it",
};

function post(bodyLength: number) {
  return JSON.stringify({
    hooks: ["Hook one.", "Hook two.", "Hook three."],
    body: "x".repeat(bodyLength),
    cta: "What do you think?",
    hashtags: ["#QA"],
  });
}

/** Replies with each response in turn and records every prompt it was sent. */
function scriptedProvider(responses: string[]) {
  const prompts: string[] = [];
  const provider: AIProvider = {
    async generate(prompt) {
      prompts.push(prompt);
      const next = responses.shift();
      if (!next) throw new Error("no more scripted responses");
      return next;
    },
  };
  return { provider, prompts };
}

describe("generatePost length guard", () => {
  it("returns a draft within LinkedIn's limit after a single call", async () => {
    const { provider, prompts } = scriptedProvider([post(1500)]);
    const result = await generatePost(provider, INPUT);
    expect(prompts).toHaveLength(1);
    expect(result.body).toHaveLength(1500);
  });

  it("asks for a shorter version when the draft is over the limit, passing the draft and its length", async () => {
    const { provider, prompts } = scriptedProvider([post(4400), post(1800)]);
    const result = await generatePost(provider, INPUT);

    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("Current post to revise");
    expect(prompts[1]).toMatch(/shorten — it is \d{4} characters now/);
    expect(result.body).toHaveLength(1800);
  });

  it("keeps the shorter of the two if the retry is still over the limit", async () => {
    const { provider } = scriptedProvider([post(5000), post(3500)]);
    const result = await generatePost(provider, INPUT);
    expect(result.body).toHaveLength(3500);
  });

  it("keeps the original if the retry comes back longer", async () => {
    const { provider } = scriptedProvider([post(3200), post(3900)]);
    const result = await generatePost(provider, INPUT);
    expect(result.body).toHaveLength(3200);
  });
});
