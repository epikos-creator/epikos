# Odyssey Scene-Art Set — Prompt Log

Flagship demo imagery for Epikos: 8 scene stills + 1 hero key-art frame, generated with
`gpt-image-1-mini` (OpenAI image model) at 1536×1024, then center-cropped to 16:9
(1536×864) and encoded as progressive-friendly JPEG (mozjpeg, q82) with `sharp`.
All files are 100% AI-generated — nothing is lifted from existing art or film stills.

**Shared style directive** (appended to every prompt, abbreviated `[STYLE]`):
"Painterly cinematic film still from one film, muted deep navy and antique gold color
grade, dramatic film lighting, no text, no watermark, no modern objects."

**Odysseus design** (used in shots 1, 6, 7, 8 — abbreviated `[ODYSSEUS]`):
"a weathered Greek hero with dark beard and shoulder-length dark hair, wearing a worn
brown wool cloak over a simple tunic". For shot 8 he reads as king: "a weathered Greek
king with dark beard in a rough earthen-brown cloak". This is the anchor description to
reuse for any extended set.

---

## hero-key-art.jpg
- **Dimensions:** 1536×864 (16:9) · **Size:** 74 KB
- **Prompt:** "Epic cinematic wide key-art frame for a film adaptation of Homer's
  Odyssey: an ancient Greek black-hulled warship with rows of oars cutting through a
  deep wine-dark sea, waves churning, vast dramatic navy storm clouds parting to reveal
  a band of golden dawn light on the horizon, rim-lit sails, majestic and painterly.
  [STYLE: Wide 16:9 composition, ship centered, epic scale.]"
- **Mood:** The whole epic in one frame — voyage, storm and promise of gold on the horizon.

## 01-ithaca-dusk.jpg
- **Dimensions:** 1536×864 (16:9) · **Size:** 48 KB
- **Prompt:** "Wide interior of a bronze-age Greek megaron hall at dusk, long empty
  wooden tables, great columns, a single hearth fire casting warm gold firelight, dust
  motes in the light, [ODYSSEUS] seated alone on a stool beside the fire with head
  bowed, waiting. [STYLE]"
- **Mood:** Empty grandeur and long loneliness; the hall waits for its king.

## 02-ships-troy.jpg
- **Dimensions:** 1536×864 (16:9) · **Size:** 56 KB
- **Prompt:** "Dawn at sea: black ancient Greek ships with rows of oars sailing away
  from a distant burning walled city on the shore behind, smoke columns, rosy gold dawn
  sky, deep wine-dark sea with long swell. [STYLE]"
- **Mood:** Departure and aftermath — Troy still burning on the horizon.

## 03-cyclops-cave.jpg
- **Dimensions:** 1536×864 (16:9) · **Size:** 62 KB
- **Prompt:** "Inside a vast Cyclops cave seen from the dark interior: a gigantic
  one-eyed giant silhouette blocking the cave mouth against daylight, immense scale, a
  small campfire in the foreground casting orange firelight on scattered sheep bones, a
  few tiny Greek sailors in shadow. [STYLE]"
- **Mood:** Awe and dread; scale is everything here.

## 04-sirens.jpg
- **Dimensions:** 1536×864 (16:9) · **Size:** 58 KB
- **Prompt:** "Night: an ancient Greek ship rowing past towering bone-white cliffs,
  silver moonlight on the water, beautiful winged women figures perched on the rocks
  singing, crew straining at long oars, sea birds, moonlit haze. [STYLE]"
- **Mood:** Cold, hypnotic beauty — moonlight and impossible choice.

## 05-scylla-charybdis.jpg
- **Dimensions:** 1536×864 (16:9) · **Size:** 75 KB
- **Prompt:** "An ancient Greek ship trapped between two horrors: on one side a cliff
  cave where a huge serpent-headed sea monster with many snapping heads reaches out,
  on the other side a colossal whirlpool swallowing the sea, storm lightning, giant
  waves, crew straining at oars, night terror. [STYLE]"
- **Mood:** No good option — monster on one side, maelstrom on the other.

## 06-calypso-island.jpg
- **Dimensions:** 1536×864 (16:9) · **Size:** 79 KB
- **Prompt:** "A lush hidden island shore at golden hour: green trees, a waterfall, a
  cave mouth, warm golden light, and a single [ODYSSEUS] standing at the water's edge
  looking out to a vast calm sea, longing. [STYLE]"
- **Mood:** Paradise that is also a prison; warmth with no way home.

## 07-storm-wreck.jpg
- **Dimensions:** 1536×864 (16:9) · **Size:** 67 KB
- **Prompt:** "Night storm: an ancient Greek ship breaking apart in colossal black
  waves, snapped mast, rigging tangled, lightning splitting the sky, and one [ODYSSEUS]
  in a torn brown cloak clinging to a floating wooden spar among the wreckage, rain.
  [STYLE]"
- **Mood:** Total catastrophe; one man against the sea at its angriest.

## 08-the-return.jpg
- **Dimensions:** 1536×864 (16:9) · **Size:** 45 KB
- **Prompt:** "Inside a great bronze-age Greek hall at night lit by rows of gold oil
  lamps: a weathered Greek king with dark beard in a rough earthen-brown cloak drawing
  a great bow with a notch at the ready, focused and wrathful, dozens of men's faces in
  shadow watching, gold lamplight, dust in the air, epic tension. [STYLE]"
- **Mood:** Twenty years of patience resolved into one drawn string — the climax.

---

## Regeneration notes
- To extend the set, keep the `[STYLE]` suffix identical and reuse `[ODYSSEUS]` verbatim
  on any shot featuring the hero; vary only the scene clause.
- Palette is enforced in-prompt ("deep navy and antique gold") to match the brand
  anchors `#1a1a2e` / `#d1a95c`.
- Source PNGs were discarded after JPEG export; re-run any prompt above at 1536×1024
  and crop to 1536×864 to reproduce.