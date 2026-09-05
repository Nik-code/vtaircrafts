# Type-mix plan-view pictograms

The top-down aircraft shapes on the home page "Type mix" flight line are
**generated in-house from published dimensions**. Nothing is traced, copied or
derived from anyone else's artwork, so the section carries no attribution line.

## How they are drawn

`src/components/home/typemix/planforms.tsx` holds a table of dimension specs,
one per ICAO type, and `buildPlanform()` turns a spec into a set of filled SVG
paths. `src/components/home/typemix/geometry.ts` holds the primitives: a
mirroring helper, circles, capsules, lifting surfaces and bladed discs.

Every drawing therefore shares one format and one look:

- Plan view, nose up, exactly symmetric about the centreline (each half is
  built once and mirrored, so the two sides cannot drift apart).
- Straight segments and cubic curves only; no arcs, no strokes, no outlines.
- Flat shapes filled with `currentColor` and `fill-rule: evenodd`, so the tone
  (ink for fixed wing, mint for rotary, signal for the largest type) comes from
  the wrapping element. The look is an airport wayfinding pictogram, not an
  illustration.
- One path per part (fuselage, wing, nacelles, propellers, tail, rotor blades)
  so overlapping pieces never fight over a shared fill rule. The one deliberate
  hole is the fenestron ring.
- Coordinates are metres, rounded to two decimals, so the server and the client
  render byte-identical markup.
- The viewBox is measured from the finished geometry, so a type's viewBox
  aspect **is** its real length/span proportion. That is what the flight-line
  layout uses to size it, and it is why a helicopter's rotor diameter counts as
  its span: an AW109 comes out small next to an A320, as in life.

## Spec fields

Fixed wing: fuselage length and width, nose and tail-cone taper, wing root and
tip chord, span, leading-edge sweep, wing longitudinal position, engine layout
(underwing, rear-fuselage, wing-mounted propeller, none), engine count, nacelle
length and width, propeller disc radius and blade count, horizontal tail span,
chord and sweep, T-tail flag, and fin length and width.

Rotorcraft: cabin length and width (a teardrop narrowing into a tail boom),
boom length and width, main rotor radius, blade count and blade root and tip
chord, tail rotor radius (a small disc offset to one side of the boom end) or a
fenestron flag (a ring cut into the fin), a skid or wheel hint, and the boom
stabiliser span.

Balloon: envelope radius plus basket width and length.

## The types drawn, and the dimensions used

| ICAO | Type | Span / rotor diameter | Length | Notes |
|---|---|---|---|---|
| A20N | Airbus A320neo | 35.80 m | 37.57 m | 27 degree wing, large LEAP nacelles |
| A21N | Airbus A321neo | 35.80 m | 44.51 m | A320neo wing, stretched fuselage |
| A320 | Airbus A320 | 34.10 m | 37.57 m | smaller CFM56 nacelles |
| B738 | Boeing 737-800 | 35.79 m | 39.47 m | flattened nacelles, well forward |
| B38M | Boeing 737-8 | 35.92 m | 39.52 m | larger nacelles, split-tip winglets hinted at each tip |
| B788 | Boeing 787-8 | 60.12 m | 56.72 m | raked 32 degree wing, large nacelles |
| AT76 | ATR 72-600 | 27.05 m | 27.17 m | straight high wing, two propeller discs, T-tail |
| DH8D | Dash 8 Q400 | 28.42 m | 32.84 m | straight high wing, two propeller discs, T-tail, long slim fuselage |
| B350 | King Air 350 | 17.65 m | 14.22 m | low straight wing, two propeller discs, T-tail |
| BE20 | King Air 200 | 16.61 m | 13.34 m | as B350, slightly smaller |
| AS50 | Airbus H125 (AS350) | 10.69 m | 12.94 m | 3-blade rotor, tail rotor, skids |
| AS65 | Airbus Dauphin (AS365) | 11.80 m | 13.68 m | 4-blade rotor, fenestron, wheels |
| A109 | Leonardo AW109 | 11.00 m | 13.04 m | 4-blade rotor, tail rotor, wheels |
| B412 | Bell 412 | 14.02 m | 17.10 m | 4-blade rotor, tail rotor, skids |

Generic fallbacks cover any type without its own spec: `FW` (an A320-sized
narrowbody), `RW` (a light twin-engine helicopter) and `B` (a balloon envelope
with a basket). They also supply the wing-category key under the drawing.

Two liberties are taken for legibility at the size these are drawn: propeller
blades are drawn fatter than scale chord, since a scale blade would be thinner
than a pixel, and every rotor is phased so no blade lies along the fuselage
axis, which would otherwise read as a pair of swept wings rather than a rotor.
