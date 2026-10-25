import type { Metadata } from "next";
import { getMeta } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { Container, PageHeader, SectionHeader } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Sources and method",
  description: "Where every fact on vtaircrafts.in comes from, and how the index is rebuilt each month from DGCA's lists.",
  alternates: { canonical: "/data" },
};

const REPO = "https://github.com/Nik-code/vtaircrafts";

const OTHER_SOURCES = [
  {
    name: "DGCA aircraft registration and deregistration reports",
    url: "https://www.dgca.gov.in/digigov-portal/",
    use: "October 2009 to date (July to December 2021 is scanned and not read): registration and deregistration dates, serial numbers, year of manufacture, owners and lessors. The current year is re-read every month.",
  },
  {
    name: "DGCA list of flying training organisations",
    url: "https://public-prd-dgca.s3.ap-south-1.amazonaws.com/InventoryList/personal/training/pilot/flrTrainOrgs/flyclub.pdf",
    use: "Every approved flying school, its bases and approval, and the aircraft it lists. Refreshed monthly.",
  },
  {
    name: "Wayback Machine captures of the DGCA operator lists",
    url: "https://web.archive.org/",
    use: "Earlier editions of both lists back to 2005, which date when aircraft joined, left or moved between operators.",
  },
  {
    name: "tar1090-db",
    url: "https://github.com/wiedehopf/tar1090-db",
    use: "Mode S hex addresses and ICAO type designators.",
  },
  {
    name: "VRS standing-data (CC0)",
    url: "https://github.com/vradarserver/standing-data",
    use: "Build year and serial number where DGCA's reports have none, and engine count and wake category per type.",
  },
  {
    name: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/",
    use: "Photographs, each credited with its photographer and licence.",
  },
];

const METHOD_STEPS = [
  "Download both DGCA PDFs on a schedule, and keep the original files with their sha256 hashes for every snapshot.",
  "Parse each page positionally with poppler's word boxes, since the PDFs are spreadsheets printed flat rather than tagged tables.",
  "Strip the repeated header overlay DGCA stamps on every page, and re-join registrations that the renderer split across lines.",
  "Normalise types and enrich each record with ICAO hex addresses and type designators from the tar1090 aircraft database.",
  "Each month, snapshot the parsed lists, diff them against the previous snapshot, and select a Wikimedia Commons photo for each registration.",
];

export default function DataPage() {
  const meta = getMeta();

  return (
    <main className="py-10 sm:py-14">
      <Container className="max-w-[880px]!">
        <PageHeader
          eyebrow={`Snapshot ${fmtDate(meta.snapshot)}`}
          title="Sources and method"
          lede="Where every fact on this site comes from, and how the index is rebuilt each month. The compiled dataset is versioned on GitHub under CC BY 4.0."
        />

        <section className="mt-14">
          <SectionHeader title="Method" />
          <ol className="space-y-4">
            {METHOD_STEPS.map((step, i) => (
              <li key={step} className="flex gap-4 text-[16px] leading-relaxed text-fg-2">
                <span className="num w-6 shrink-0 font-medium text-fg">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16">
          <SectionHeader title="Sources" />
          <ul className="space-y-5">
            {meta.sources.map((s) => (
              <li key={s.file}>
                <a href={s.url} target="_blank" rel="noreferrer" className="mono text-[15px] font-medium text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                  {s.file}
                </a>
                <p className="mt-1 text-[14px] text-fg-2">
                  {s.category === "scheduled" ? "Scheduled operators" : "Non-scheduled operators"} · as on {fmtDate(s.asOn)} · {fmtInt(s.aircraft)} aircraft · {s.operators} operators
                </p>
                {s.sha256 && <p className="mono mt-1 break-all text-[12px] text-fg-3">sha256 {s.sha256}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <SectionHeader title="Other sources" />
          <ul className="space-y-5 text-[15px]">
            {OTHER_SOURCES.map((s) => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                  {s.name}
                </a>
                <p className="mt-1 text-[14px] text-fg-2">{s.use}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <SectionHeader title="Coverage and limits" />
          <p className="max-w-[64ch] text-[16px] leading-relaxed text-fg-2">
            The core index is every aircraft on a scheduled or non-scheduled operator permit. Flying school aircraft come from
            DGCA&rsquo;s separate list of flying training organisations. Privately owned and state government aircraft have no
            current public list: they appear only when a registration report names them, and their pages carry only what those
            reports say. DGCA has not published a full register extract since 2019.
          </p>
        </section>

        <section className="mt-16">
          <SectionHeader title="Licences" />
          <div className="max-w-[64ch] space-y-4 text-[16px] leading-relaxed text-fg-2">
            <p>Source material is © Directorate General of Civil Aviation, reproduced with acknowledgement under the DGCA website policy.</p>
            <p>
              The compiled dataset is released under CC BY 4.0. Suggested citation: &ldquo;vtaircrafts.in, from DGCA operator lists&rdquo;. Code is
              MIT licensed. Photographs keep their individual Creative Commons licences and photographer credits, shown with every image.
            </p>
            <p>
              The code and every monthly dataset release are on{" "}
              <a href={REPO} target="_blank" rel="noreferrer" className="text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                GitHub
              </a>
              .
            </p>
            <p>This is an independent, unofficial index. It is not the Indian civil aircraft register and must not be used for operational or legal purposes.</p>
          </div>
        </section>
      </Container>
    </main>
  );
}

