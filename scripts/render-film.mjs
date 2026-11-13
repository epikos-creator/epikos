#!/usr/bin/env node
/**
 * Renders the flagship Odyssey short film deterministically with ffmpeg — no
 * browser, no screen capture.
 *
 *   node scripts/render-film.mjs            # writes public/film/odyssey-cyclops.mp4
 *
 * Sources:
 *   - dialogue: ODYSSEY_CYCLOPS in src/lib/odyssey-script.ts (the same script the
 *     demo pipeline serves, imported — never retyped)
 *   - stills:   public/images/odyssey/ (story order, via src/lib/odyssey-frames.ts)
 *
 * Output: 1280x720, 30fps, H.264 yuv420p + AAC, +faststart, ~86s.
 *
 * ffmpeg/ffprobe live outside /home; `bash /home/team/shared/setup-toolchain.sh`
 * reinstalls them after a machine rebuild.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, rmSync, statSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ODYSSEY_CYCLOPS } from "../src/lib/odyssey-script.ts";
import { sceneImage } from "../src/lib/odyssey-frames.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/film/odyssey-cyclops.mp4");

// ── Format ──
const W = 1280;
const H = 720;
const FPS = 30;
const TITLE_SEC = 3.0;
const SCENE_SEC = 10.0;
const CLOSING_SEC = 3.5;
const SCENES = ODYSSEY_CYCLOPS.scenes.length;
const TOTAL_SEC = TITLE_SEC + SCENES * SCENE_SEC + CLOSING_SEC;

const NAVY = "0x1a1a2e";
const GOLD = "0xd1a95c";

// ── Fonts ──
// Cinzel (display, brand headings) for the title and location slugs; Inter
// (body) for dialogue, because Cinzel is an all-caps face and four lines of
// shouted capitals are hard to read at 720p. Both are SIL OFL from Google
// Fonts, fetched on demand into scripts/.fonts/ (gitignored); DejaVu is the
// fallback when the machine has no network.
const FONT_DIR = join(ROOT, "scripts/.fonts");
const FONTS = {
  display: {
    file: "Cinzel.ttf",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel%5Bwght%5D.ttf",
    fallback: "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
  },
  body: {
    file: "Inter.ttf",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf",
    fallback: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  },
};

function ensureFont(font) {
  mkdirSync(FONT_DIR, { recursive: true });
  const local = join(FONT_DIR, font.file);
  if (existsSync(local) && statSync(local).size > 20_000) return local;
  spawnSync("curl", ["-sSLf", "-o", local, font.url], { stdio: "ignore" });
  if (existsSync(local) && statSync(local).size > 20_000) return local;
  rmSync(local, { force: true });
  if (existsSync(font.fallback)) {
    console.warn(`[film] ${font.file} unavailable — falling back to ${font.fallback}`);
    return font.fallback;
  }
  throw new Error(`No usable font found for ${font.file}`);
}

// ── Text helpers ──

/** Strip a leading screenwriting stage direction: "(laughing) Line..." */
function stripDirection(line) {
  return line.replace(/^\s*\([^)]*\)\s*/, "").trim();
}

/** Greedy word wrap to `max` characters per line. */
function wrap(text, max) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const word of words) {
    if (!cur) cur = word;
    else if ((cur + " " + word).length <= max) cur += " " + word;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Wrap a dialogue caption into blocks of at most `maxLines` lines each. */
function dialogueBlocks(character, line, maxChars, maxLines) {
  const lines = wrap(line, maxChars);
  const blocks = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    blocks.push([character, ...lines.slice(i, i + maxLines)]);
  }
  return blocks;
}

/**
 * Build the caption cards for one scene: the location card at the head, then
 * 2–3 dialogue cards spread across the rest of the scene.
 */
function sceneCaptions(scene) {
  const cards = [];

  // Location card, right at the top of the scene.
  cards.push({
    lines: [scene.location],
    start: 0.35,
    end: 2.6,
    fontsize: 26,
    boxAlpha: 0.7,
    font: "display",
  });

  const spoken = scene.dialogue
    .map((d) => ({ character: d.character, line: stripDirection(d.line) }))
    .filter((d) => d.line.length > 0);

  // Prefer the first and the last beat; add a middle one when it is short
  // enough to read without crowding the frame.
  let picked;
  if (spoken.length <= 3) picked = spoken;
  else {
    const middle = spoken[Math.floor(spoken.length / 2)];
    picked = [spoken[0], ...(middle.line.length <= 90 ? [middle] : []), spoken[spoken.length - 1]];
  }

  // Turn each picked line into one or more cards (long lines split in two).
  const blocks = [];
  for (const d of picked) {
    for (const b of dialogueBlocks(d.character, d.line, 58, 3)) blocks.push(b);
  }

  const from = 3.0;
  const to = SCENE_SEC - 0.5;
  const slot = (to - from) / blocks.length;
  blocks.forEach((lines, i) => {
    cards.push({
      lines,
      start: from + i * slot,
      end: from + (i + 1) * slot - 0.15,
      fontsize: 27,
      boxAlpha: 0.74,
      font: "body",
    });
  });

  return cards;
}

/** drawtext filter string for one caption card. */
function drawtext(card, fontfile, file) {
  const parts = [
    `drawtext=fontfile=${fontfile}`,
    `textfile=${file}`,
    `expansion=none`,
    `fontcolor=${card.color ?? GOLD}`,
    `fontsize=${card.fontsize}`,
    `line_spacing=${Math.round(card.fontsize * 0.42)}`,
    `box=1`,
    `boxcolor=${NAVY}@${card.boxAlpha}`,
    `boxborderw=${Math.round(card.fontsize * 0.6)}`,
    `x=(w-text_w)/2`,
    `y=h-text_h-${card.bottomPad ?? 54}`,
    `enable='between(t,${card.start.toFixed(2)},${card.end.toFixed(2)})'`,
  ];
  return parts.join(":");
}

// ── Score ──
// A simple synthesised bed: a low drone in A minor with slow swells, a soft
// frame-drum pulse, gentle fades. Written as a 44.1kHz 16-bit stereo WAV.

function synthesiseScore(path, seconds) {
  const SR = 44100;
  const N = Math.round(seconds * SR);
  const L = new Float64Array(N);
  const R = new Float64Array(N);

  const drone = [
    { f: 55.0, a: 0.34, lfo: 0.055, phase: 0.0 },
    { f: 82.5, a: 0.2, lfo: 0.041, phase: 1.7 },
    { f: 110.0, a: 0.16, lfo: 0.07, phase: 3.1 },
    { f: 164.81, a: 0.075, lfo: 0.033, phase: 4.4 },
    { f: 220.0, a: 0.035, lfo: 0.026, phase: 2.2 },
  ];

  // Scene boundaries get a slow swell so the score breathes with the cuts.
  const swells = [];
  for (let i = 0; i <= SCENES; i++) swells.push(TITLE_SEC + i * SCENE_SEC);

  const twoPi = Math.PI * 2;
  for (let n = 0; n < N; n++) {
    const t = n / SR;

    let v = 0;
    for (const d of drone) {
      const lfo = 0.55 + 0.45 * Math.sin(twoPi * d.lfo * t + d.phase);
      v += d.a * lfo * Math.sin(twoPi * d.f * t + d.phase);
    }

    // Swell envelope around each scene change.
    let swell = 0;
    for (const s of swells) {
      const dt = t - s;
      if (dt > -1.5 && dt < 6) swell += 0.09 * Math.exp(-Math.pow(Math.max(dt, 0) / 2.6, 1.6)) * (dt < 0 ? 0.5 + dt / 3 : 1);
    }
    v *= 1 + swell * 2.2;

    // Soft percussion: a muted low drum on a slow pulse.
    const beat = 2.0;
    const bt = t % beat;
    if (t > TITLE_SEC - 0.5 && t < TOTAL_SEC - CLOSING_SEC + 0.5) {
      const decay = Math.exp(-bt * 9);
      const body = Math.sin(twoPi * 68 * bt) * 0.75 + Math.sin(twoPi * 102 * bt) * 0.25;
      v += 0.1 * decay * body;
      // A quieter off-beat tick for movement.
      const ot = (t + beat / 2) % beat;
      if (ot < 0.25) v += 0.02 * Math.exp(-ot * 30) * Math.sin(twoPi * 320 * ot);
    }

    // Fade in / fade out.
    let env = 1;
    if (t < 2.5) env *= t / 2.5;
    if (t > seconds - 4) env *= Math.max(0, (seconds - t) / 4);

    const s = Math.tanh(v * env * 1.25) * 0.62;
    L[n] = s;
    R[n] = s * 0.97 + 0.03 * (Math.sin(twoPi * 55 * t * 1.001) * 0.12 * env);
  }

  // Normalise to -3 dBFS so nothing clips.
  let peak = 0;
  for (let n = 0; n < N; n++) peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
  const gain = peak > 0 ? 0.7 / peak : 1;

  const data = Buffer.alloc(N * 4);
  for (let n = 0; n < N; n++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[n] * gain * 32767))), n * 4);
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[n] * gain * 32767))), n * 4 + 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(2, 22); // stereo
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
}

// ── Render ──

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (res.status !== 0) {
    console.error(res.stderr?.slice(-4000));
    throw new Error(`${cmd} failed with status ${res.status}`);
  }
  return res;
}

function main() {
  const work = join(tmpdir(), `epikos-film-${process.pid}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  mkdirSync(dirname(OUT), { recursive: true });

  const fontFile = { display: ensureFont(FONTS.display), body: ensureFont(FONTS.body) };

  // ── Caption text files ──
  let cardId = 0;
  const writeCard = (lines) => {
    const file = `card-${String(cardId++).padStart(3, "0")}.txt`;
    writeFileSync(join(work, file), lines.join("\n"), "utf8");
    return file;
  };

  const inputs = [];
  const chains = [];
  const labels = [];

  // ── Title card ──
  inputs.push(["-f", "lavfi", "-t", String(TITLE_SEC), "-i", `color=c=${NAVY}:s=${W}x${H}:r=${FPS}`]);
  {
    const title = writeCard(["THE ODYSSEY"]);
    const sub = writeCard(["THE CYCLOPS"]);
    const from = writeCard(["from Homer's Odyssey"]);
    chains.push(
      `[0:v]` +
        [
          `drawtext=fontfile=${fontFile.display}:textfile=${title}:expansion=none:fontcolor=${GOLD}:fontsize=84:x=(w-text_w)/2:y=(h-text_h)/2-70`,
          `drawtext=fontfile=${fontFile.display}:textfile=${sub}:expansion=none:fontcolor=${GOLD}@0.92:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2+30`,
          `drawtext=fontfile=${fontFile.display}:textfile=${from}:expansion=none:fontcolor=0xffffff@0.45:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+110`,
          `fade=t=in:st=0:d=0.6,fade=t=out:st=${(TITLE_SEC - 0.5).toFixed(2)}:d=0.5`,
          `setsar=1,format=yuv420p`,
        ].join(",") +
        `[v0]`,
    );
    labels.push("[v0]");
  }

  // ── Scenes ──
  ODYSSEY_CYCLOPS.scenes.forEach((scene, i) => {
    const idx = i + 1;
    const rel = sceneImage(scene.scene_number).replace(/^\//, ""); // images/odyssey/x.jpg
    const img = join(ROOT, "public", rel);
    if (!existsSync(img)) throw new Error(`Missing still: ${img}`);

    inputs.push([
      "-framerate", String(FPS), "-loop", "1", "-t", String(SCENE_SEC), "-i", img,
    ]);

    const frames = Math.round(SCENE_SEC * FPS) - 1;
    // Alternate a slow push-in and a slow pull-out so the sequence breathes.
    const pushIn = idx % 2 === 1;
    const zoom = pushIn
      ? `1+0.11*on/${frames}`
      : `1.11-0.11*on/${frames}`;
    const x = `iw/2-(iw/zoom/2)`;
    const y = pushIn ? `ih/2-(ih/zoom/2)-on*0.6` : `ih/2-(ih/zoom/2)+on*0.6`;

    const filters = [
      `scale=1920:1080:force_original_aspect_ratio=increase`,
      `crop=1920:1080`,
      `setsar=1`,
      `zoompan=z='${zoom}':x='${x}':y='${y}':d=1:s=${W}x${H}:fps=${FPS}`,
    ];

    for (const card of sceneCaptions(scene)) {
      const file = writeCard(card.lines);
      filters.push(drawtext(card, fontFile[card.font ?? "body"], file));
    }

    // Dip to black at the head and tail of each scene.
    filters.push(`fade=t=in:st=0:d=0.35`);
    filters.push(`fade=t=out:st=${(SCENE_SEC - 0.45).toFixed(2)}:d=0.45`);
    filters.push(`format=yuv420p`);

    const label = `[v${idx}]`;
    chains.push(`[${idx}:v]` + filters.join(",") + label);
    labels.push(label);
  });

  // ── Closing card ──
  const closingIdx = SCENES + 1;
  inputs.push(["-f", "lavfi", "-t", String(CLOSING_SEC), "-i", `color=c=${NAVY}:s=${W}x${H}:r=${FPS}`]);
  {
    const made = writeCard(["Made with Epikos — story to film"]);
    chains.push(
      `[${closingIdx}:v]` +
        [
          `drawtext=fontfile=${fontFile.display}:textfile=${made}:expansion=none:fontcolor=${GOLD}:fontsize=38:x=(w-text_w)/2:y=(h-text_h)/2`,
          `fade=t=in:st=0:d=0.5,fade=t=out:st=${(CLOSING_SEC - 0.8).toFixed(2)}:d=0.8`,
          `setsar=1,format=yuv420p`,
        ].join(",") +
        `[vout_card]`,
    );
    labels.push("[vout_card]");
  }

  // ── Score ──
  const wav = join(work, "score.wav");
  synthesiseScore(wav, TOTAL_SEC);
  const audioInputIdx = closingIdx + 1;
  inputs.push(["-i", wav]);

  const graph =
    chains.join(";") +
    ";" +
    labels.join("") +
    `concat=n=${labels.length}:v=1:a=0[vout]`;

  const args = [
    "-hide_banner", "-y",
    ...inputs.flat(),
    "-filter_complex", graph,
    "-map", "[vout]",
    "-map", `${audioInputIdx}:a`,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "24",
    "-maxrate", "1100k",
    "-bufsize", "2200k",
    "-profile:v", "high",
    "-pix_fmt", "yuv420p",
    "-r", String(FPS),
    "-c:a", "aac",
    "-b:a", "96k",
    "-ar", "44100",
    "-ac", "2",
    "-movflags", "+faststart",
    "-t", TOTAL_SEC.toFixed(2),
    OUT,
  ];

  console.log(`[film] rendering ${TOTAL_SEC.toFixed(1)}s @ ${W}x${H} → ${OUT}`);
  run("ffmpeg", args, { cwd: work, stdio: "inherit" });

  const mb = statSync(OUT).size / 1024 / 1024;
  console.log(`[film] wrote ${OUT} (${mb.toFixed(2)} MB)`);
  if (mb > 12) console.warn(`[film] WARNING: ${mb.toFixed(2)} MB is over the 12 MB budget`);

  rmSync(work, { recursive: true, force: true });

  // Keep a poster still next to the film if one is not already committed.
  const poster = join(ROOT, "public/film/odyssey-cyclops-poster.jpg");
  if (!existsSync(poster)) {
    copyFileSync(join(ROOT, "public/images/odyssey/hero-key-art.jpg"), poster);
    console.log(`[film] wrote poster ${poster}`);
  }
}

main();
