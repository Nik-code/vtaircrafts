export type ReportKind = "registration" | "deregistration" | "owner-change";

export interface ReportSource {
  /** file name exactly as it is stored in the DGCA bucket */
  file: string;
  kind: ReportKind;
  /** period the report covers, for the manifest and for sanity-checking dates */
  from: string;
  to: string;
}

const BASE =
  "https://public-prd-dgca.s3.ap-south-1.amazonaws.com/InventoryList/aircraft/registration/aircraftReport";

export function reportUrl(file: string): string {
  // Parentheses and spaces must be percent-encoded; slashes must not.
  return `${BASE}/${file.split("/").map(encodeURIComponent).join("/")}`;
}

export const REPORT_SOURCES: ReportSource[] = [
  { file: "reg(oct09-Sep10).pdf", kind: "registration", from: "2009-10-01", to: "2010-09-30" },
  { file: "dereg(oct09-Sep10).pdf", kind: "deregistration", from: "2009-10-01", to: "2010-09-30" },
  { file: "ownch(oct09-Sep10).pdf", kind: "owner-change", from: "2009-10-01", to: "2010-09-30" },
  { file: "reg(oct10-Dec10).pdf", kind: "registration", from: "2010-10-01", to: "2010-12-31" },
  { file: "dereg(oct10-dec10).pdf", kind: "deregistration", from: "2010-10-01", to: "2010-12-31" },
  { file: "CofR Change(oct10-dec10).pdf", kind: "owner-change", from: "2010-10-01", to: "2010-12-31" },
  { file: "reg-Jan11.PDF", kind: "registration", from: "2011-01-01", to: "2011-01-31" },
  { file: "dereg-Jan11.pdf", kind: "deregistration", from: "2011-01-01", to: "2011-01-31" },
  { file: "CofR Change-Jan11.pdf", kind: "owner-change", from: "2011-01-01", to: "2011-01-31" },
  { file: "reg(Feb11-Sep11).pdf", kind: "registration", from: "2011-02-01", to: "2011-09-30" },
  { file: "dereg(Feb11-Sep11).pdf", kind: "deregistration", from: "2011-02-01", to: "2011-09-30" },
  { file: "ChangeOwn(Feb11-Sep11).pdf", kind: "owner-change", from: "2011-02-01", to: "2011-09-30" },
  { file: "reg(Oct11-Jul12).pdf", kind: "registration", from: "2011-10-01", to: "2012-07-31" },
  { file: "dereg(Oct11-July12).pdf", kind: "deregistration", from: "2011-10-01", to: "2012-07-31" },
  { file: "ChangeOwn(Oct11-July12).pdf", kind: "owner-change", from: "2011-10-01", to: "2012-07-31" },
  { file: "reg(Aug12-Nov12).pdf", kind: "registration", from: "2012-08-01", to: "2012-11-30" },
  { file: "dereg(Aug12-Nov12).pdf", kind: "deregistration", from: "2012-08-01", to: "2012-11-30" },
  { file: "ChangeOwn(Aug12-Nov12).pdf", kind: "owner-change", from: "2012-08-01", to: "2012-11-30" },
  { file: "reg(Dec12-Aug13).pdf", kind: "registration", from: "2012-12-01", to: "2013-08-31" },
  { file: "dereg(Dec12-Aug13).pdf", kind: "deregistration", from: "2012-12-01", to: "2013-08-31" },
  { file: "ChangeOwn(Dec12-Aug13).pdf", kind: "owner-change", from: "2012-12-01", to: "2013-08-31" },
  { file: "reg(Jan_Mar2019).pdf", kind: "registration", from: "2019-01-01", to: "2019-03-31" },
  { file: "dereg(Jan_Mar2019).pdf", kind: "deregistration", from: "2019-01-01", to: "2019-03-31" },
];
