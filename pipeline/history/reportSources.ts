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
  { file: "Aircraft Registered between Sep 2013 to Dec 2013_.pdf", kind: "registration", from: "2013-09-01", to: "2013-12-31" },
  { file: "2013.pdf", kind: "deregistration", from: "2013-09-01", to: "2013-12-31" },
  { file: "Aircraft Registered Jan 2014 to Dec 2014.pdf", kind: "registration", from: "2014-01-01", to: "2014-12-31" },
  { file: "2014.pdf", kind: "deregistration", from: "2014-01-01", to: "2014-12-31" },
  { file: "Aircraft Registered Jan 2015 to Dec 2015_.pdf", kind: "registration", from: "2015-01-01", to: "2015-12-31" },
  { file: "2015.pdf", kind: "deregistration", from: "2015-01-01", to: "2015-12-31" },
  { file: "Aircraft Registered Jan 2016 to Dec 2016.pdf", kind: "registration", from: "2016-01-01", to: "2016-12-31" },
  { file: "2016.pdf", kind: "deregistration", from: "2016-01-01", to: "2016-12-31" },
  { file: "Aircraft Registered Jan 2017 to Dec 2017_.pdf", kind: "registration", from: "2017-01-01", to: "2017-12-31" },
  { file: "2017.pdf", kind: "deregistration", from: "2017-01-01", to: "2017-12-31" },
  { file: "Aircraft Registered Jan 2018 to Dec 2018_.pdf", kind: "registration", from: "2018-01-01", to: "2018-12-31" },
  { file: "2018.pdf", kind: "deregistration", from: "2018-01-01", to: "2018-12-31" },
  { file: "reg(Jan_Mar2019).pdf", kind: "registration", from: "2019-01-01", to: "2019-03-31" },
  { file: "dereg(Jan_Mar2019).pdf", kind: "deregistration", from: "2019-01-01", to: "2019-03-31" },
  { file: "reg(Apr_June2019).pdf", kind: "registration", from: "2019-04-01", to: "2019-06-30" },
  { file: "Dereg(April_Jun2019).pdf", kind: "deregistration", from: "2019-04-01", to: "2019-06-30" },
  { file: "reg(July_Sept2019).pdf", kind: "registration", from: "2019-07-01", to: "2019-09-30" },
  { file: "Dereg(July_Sept2019).pdf", kind: "deregistration", from: "2019-07-01", to: "2019-09-30" },
  { file: "Reg(Oct_Dec2019).pdf", kind: "registration", from: "2019-10-01", to: "2019-12-31" },
  { file: "Dereg(Oct_Dec2019).pdf", kind: "deregistration", from: "2019-10-01", to: "2019-12-31" },
  { file: "Reg(Jan_Mar2020).pdf", kind: "registration", from: "2020-01-01", to: "2020-03-31" },
  { file: "Dereg(Jan_Mar2020).pdf", kind: "deregistration", from: "2020-01-01", to: "2020-03-31" },
  { file: "Reg(Apr_Jun2020).pdf", kind: "registration", from: "2020-04-01", to: "2020-06-30" },
  { file: "Dereg(Apr_June2020).pdf", kind: "deregistration", from: "2020-04-01", to: "2020-06-30" },
  { file: "Reg(July_Dec2020).pdf", kind: "registration", from: "2020-07-01", to: "2020-12-31" },
  { file: "Dereg(Jul_Dec2020).pdf", kind: "deregistration", from: "2020-07-01", to: "2020-12-31" },
  { file: "Reg(Jan_Jun2021).pdf", kind: "registration", from: "2021-01-01", to: "2021-06-30" },
  { file: "Dereg(Jan_Jun2021).pdf", kind: "deregistration", from: "2021-01-01", to: "2021-06-30" },
  // Reg(Jul_Dec2021).pdf and Dereg(Jul_Dec2021).pdf are left out: DGCA printed them to PDF as
  // outlines with no text layer, and OCR misreads too many registrations to be trusted.
  { file: "Reg(Jan_Dec2022).pdf", kind: "registration", from: "2022-01-01", to: "2022-12-31" },
  { file: "Dereg(Jan_Dec2022).pdf", kind: "deregistration", from: "2022-01-01", to: "2022-12-31" },
  { file: "Aircraft Registered Data 2023.pdf", kind: "registration", from: "2023-01-01", to: "2023-12-31" },
  { file: "Aircraft De-Registered Data 2023.pdf", kind: "deregistration", from: "2023-01-01", to: "2023-12-31" },
  { file: "Register data 2024.pdf", kind: "registration", from: "2024-01-01", to: "2024-12-31" },
  { file: "De-registered Data 2024.pdf", kind: "deregistration", from: "2024-01-01", to: "2024-12-31" },
  { file: "Aircraft Registered Data 2025.pdf", kind: "registration", from: "2025-01-01", to: "2025-12-31" },
  { file: "Aircraft De-Register Data 2025.pdf", kind: "deregistration", from: "2025-01-01", to: "2025-12-31" },
];
