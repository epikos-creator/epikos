// Shared mapping from a scene number to the Odyssey key-art still that
// represents it. The 8 frames are in story order; scripts with more scenes
// than frames cycle through them.
const FRAMES = [
  "01-ithaca-dusk",
  "02-ships-troy",
  "03-cyclops-cave",
  "04-sirens",
  "05-scylla-charybdis",
  "06-calypso-island",
  "07-storm-wreck",
  "08-the-return",
];

export function sceneImage(sceneNumber: number): string {
  const idx = (sceneNumber - 1) % FRAMES.length;
  return `/images/odyssey/${FRAMES[idx]}.jpg`;
}