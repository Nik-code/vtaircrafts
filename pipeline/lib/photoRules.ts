// Subjects a fleet photograph must not show, shared by the scorer (pipeline/images.ts)
// and the assigner (pipeline/lib/assignImages.ts) so a cached candidate is judged by the
// same rule as a freshly fetched one.
//
// Every aircraft on the site is a civil aircraft on an Indian operator permit. A photograph
// of the same type in military, police or government-agency service, an accident,
// evacuation or seizure, or a drawing, mock-up or museum piece, is not a representative
// photograph of it.

/** Tested against the file title and its category names. */
export const UNSUITABLE_SUBJECT =
  /\b(air ?force|navy|army|marine corps|coast ?guard|CCGS|military|militar|luftwaffe|armée|ejército|police|polic[ií]a|polizei|polizia|gendarmerie|carabinieri|guardia|sheriff|NYPD|LAPD|FBI|DOJ|spy plane|surveillance|border patrol|customs|homeland security|national guard|commando|airstrike|air strike|gunship|combat|warfare|USS|HMS|HMAS|HMCS|warship|frigate|destroyer|aircraft carrier|fighter|F-35|NTSB|National Transportation Safety Board|AAIB|accident investigation|crash|crashed|crashes|accident|incident|wreck|wreckage|evacuat\w*|confiscat\w*|seized|impounded|emergency landing|on fire|burn(?:t|ed|ing)|debris|scrapped|derelict|boneyard|graveyard|stored aircraft|storage|three[- ]views?|drawing|diagram|silhouette|mock-?up|scale model|museum)\b/i;

/** Tested against the file description, where a benign title can hide an accident report. */
export const UNSUITABLE_DESCRIPTION =
  /\b(crash|crashed|crashes|accident|incident|wreck|wreckage|evacuat\w*|confiscat\w*|seized|impounded|emergency landing|debris|on fire|burn(?:t|ed|ing)|shot down|airstrike|air strike|NTSB)\b/i;
