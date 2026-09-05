# Type-mix plan-view silhouettes

Source list for the top-down aircraft silhouettes used in the "Type mix" flight
line on the home page (`src/components/home/typemix/planforms.tsx`). Two are
traced from Wikimedia Commons; the rest are drawn in-house because no usable
top-view silhouette could be found on Commons under an acceptable licence
(CC0, public domain, CC BY or CC BY-SA) after a reasonable search.

## From Wikimedia Commons

| ICAO | Type | File | Author | Licence |
|---|---|---|---|---|
| B738 | Boeing 737-800 | [File:Boeing 737-800 silhouette.svg](https://commons.wikimedia.org/wiki/File:Boeing_737-800_silhouette.svg) | Peter James Lowden (Commons user FlyingPete) | CC BY-SA 4.0 |
| B788 | Boeing 787-8 | [File:Boeing 787-8 silhouette.svg](https://commons.wikimedia.org/wiki/File:Boeing_787-8_silhouette.svg) | Peter James Lowden (Commons user FlyingPete) | CC BY-SA 4.0 |
| B38M | Boeing 737-8 (MAX) | reuses the 737-800 file above | Peter James Lowden (Commons user FlyingPete) | CC BY-SA 4.0 |

FlyingPete's uploads (`action=query&list=usercontribs&ucuser=FlyingPete`) cover
a range of Boeing widebodies and narrowbodies plus a few general-aviation
types, but no 737 MAX, no Airbus, no ATR, no Dash 8, no King Air and no
helicopters. B38M (737-8) reuses the 737-800 drawing unmodified: the two
airframes share essentially the same planform (wing, tail and fuselage
proportions are within a few percent) and no 737 MAX silhouette exists on
Commons.

Both files were downloaded as SVG, then: the `matrix(1,0,0,-1,0,64)` transform
in the source file was baked into absolute coordinates (this is what makes the
FlyingPete series nose-up when unflipped, so no extra rotation was needed),
the outline was cropped tight to its own bounding box, and simplified with
Ramer–Douglas–Peucker (epsilon 0.25–0.3) to bring each path under ~800 bytes.
Ids, inline styles and the stroke were dropped; the shape is filled with
`currentColor` only, so colour comes from CSS in the app.

## Searched for, not found on an acceptable licence

Commons searches (via `action=query&list=search&srnamespace=6`) for each of
the remaining types and their close synonyms — "Airbus A320 top view
silhouette svg", "A320neo/A321neo silhouette", "ATR 72 silhouette svg",
"Dash 8 Q400 silhouette", "King Air 350/200 silhouette", "AW109 silhouette",
"Eurocopter/Airbus Dauphin AS365 silhouette", plus the categories suggested
for this search ("Category:Aircraft silhouettes", "Category:Airliner
silhouettes", "Category:Airbus A320 family silhouettes") — returned either no
results, unrelated file types (mostly digitised books matching on the word
"silhouette"), or side-profile/photographic silhouettes rather than top-down
plan views. `Airbus A380 silhouette.svg` and `Airbus A400M silhouette.svg`
exist (CC BY-SA) but are different aircraft with no relevance to the types
used here, and their uploaders' other contributions don't cover any of these
types either.

## Drawn in-house

All of the following are original top-down plan-view drawings for
vtaircrafts.in, built as a single filled path (plus separate paths for engine
pods and, on rotorcraft, the rotor disc) so each stays under ~1.5 KB. Each
viewBox is cropped to the drawing's own bounding box, so its aspect ratio
already encodes the type's real span/length (or rotor-diameter/length)
proportion used to size it in the flight-line chart.

| ICAO | Type | Notes |
|---|---|---|
| A20N | Airbus A320neo | Swept low wing, two underwing pods, swept tailplane. |
| A21N | Airbus A321neo | Same family as A20N, stretched fuselage. |
| A320 | Airbus A320 (ceo) | Same family as A20N; also used as the generic fixed-wing fallback (`FW`). |
| AT76 | ATR 72-600 | High straight wing, T-tail, propeller-disc rings on both nacelles. |
| DH8D | Dash 8 Q400 | Same family template as AT76: high wing, T-tail, propeller-disc rings. |
| B350 | Beechcraft King Air 350 | Short fuselage, wide straight wing, T-tail, propeller-disc rings. |
| BE20 | Beechcraft King Air 200 | Scaled down from the King Air 350 drawing (same T-tail twin-turboprop family), per the brief's suggested reuse. |
| AS65 | Airbus Helicopters Dauphin (AS365) | Teardrop cabin, tapering tail boom, shrouded fenestron tail fan, 4-blade main rotor disc. |
| A109 | Leonardo AW109 | Teardrop cabin, tail boom, exposed tail-rotor disc, 4-blade main rotor disc; also used as the generic rotary fallback (`RW`). |

A generic balloon fallback (`B`, plan-view envelope + gondola) is included for
completeness even though no balloon type is among the 12 drawn on the current
sheet.

## Attribution

Because two of the drawings above are CC BY-SA 4.0, the Type mix section
carries the line "Silhouettes: Wikimedia Commons contributors, see
docs/SILHOUETTES.md" per DESIGN.md's attribution rule.
