import Link from "next/link";

export default function LandingPage() {
  return (
    <main>
      {/* Hero — dark ink ground, brass rule as the one bold gesture on the page */}
      <section className="bg-ink-950 text-paper">
        <div className="mx-auto max-w-5xl px-6 py-28 sm:py-36">
          <div className="h-px w-16 bg-brass-500" />
          <h1 className="mt-8 font-display text-4xl leading-[1.1] text-paper sm:text-6xl">
            Turn your professional
            <br />
            knowledge into visibility.
          </h1>
          <p className="mt-6 max-w-prose text-lg text-ink-100">
            Every specialist who does good work has something to say — whatever
            the field. Most professionals just never turn it into a LinkedIn
            post. This tool
            reviews how you currently present yourself, then helps you write about
            what you actually know, on a schedule you set.
          </p>
          <div className="mt-10">
            <Link
              href="/signup"
              className="inline-block rounded-card bg-brass-500 px-7 py-3.5 font-body text-sm font-semibold text-ink-950 transition-colors hover:bg-brass-400"
            >
              Start growing my professional presence
            </Link>
          </div>
        </div>
      </section>

      {/* How it works — a genuine two-phase sequence, so numbering earns its place here */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="grid gap-16 sm:grid-cols-2">
          <div>
            <span className="font-display text-5xl text-brass-500">1</span>
            <h2 className="mt-3 font-display text-2xl text-ink-900">
              Profile makeover
            </h2>
            <p className="mt-3 max-w-prose text-ink-700">
              Paste your current headline, About section, and a couple of
              experience bullets. You&apos;ll get a specific critique and a rewrite
              for each — not &quot;add more keywords,&quot; but the actual sentence swapped
              in. Upload your profile photo too; if it needs work, you&apos;ll get a
              corrected version to download.
            </p>
          </div>
          <div>
            <span className="font-display text-5xl text-brass-500">2</span>
            <h2 className="mt-3 font-display text-2xl text-ink-900">
              Ongoing growth mode
            </h2>
            <p className="mt-3 max-w-prose text-ink-700">
              Pick how often you want to post. From there, the tool researches
              what&apos;s actually moving in your field, hands you a few angles worth
              writing about, and drafts a post in your voice. You edit, approve,
              and publish it yourself — nothing goes out without you reading it
              first.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100 px-6 py-10">
        <p className="mx-auto max-w-5xl text-sm text-ink-500">
          Growth Agent — built for professionals who&apos;d rather write one good post
          a week than scroll for an hour trying to think of one.
        </p>
      </footer>
    </main>
  );
}
