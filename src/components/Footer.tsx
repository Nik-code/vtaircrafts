import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-3">
        <div>
          <div className="label mb-2">Source</div>
          <p className="text-sm text-fg-muted">
            Directorate General of Civil Aviation, lists of scheduled and non-scheduled operators.
            Reproduced with acknowledgement under DGCA&apos;s website policy. Not an official register.
          </p>
        </div>
        <div>
          <div className="label mb-2">Images</div>
          <p className="text-sm text-fg-muted">
            Photographs are from Wikimedia Commons under Creative Commons licences. Each image credits its
            photographer and links to the original.
          </p>
        </div>
        <div>
          <div className="label mb-2">Open</div>
          <p className="text-sm text-fg-muted">
            Code MIT, dataset CC BY 4.0.{" "}
            <Link href="/data" className="text-fg underline decoration-line-strong hover:decoration-accent">
              Download the data
            </Link>{" "}
            or read the methodology.
          </p>
        </div>
      </div>
    </footer>
  );
}
