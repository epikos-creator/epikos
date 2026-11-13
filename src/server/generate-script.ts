import { createServerFn } from "@tanstack/react-start";
import { ODYSSEY_CYCLOPS } from "~/lib/odyssey-script";
import type { Script } from "~/lib/odyssey-script";

export type { Scene, Script } from "~/lib/odyssey-script";

let lastScript: Script | null = null;

export function getLastScript(): Script | null {
  return lastScript;
}

// ── Text-based adaptation for custom prompts ──

function adaptCustomPrompt(prompt: string): Script {
  const trimmed = prompt.trim();
  // Extract a title from the first line or first 60 chars
  const firstLine = trimmed.split("\n")[0].slice(0, 80);
  const title = firstLine.length > 40 ? firstLine.slice(0, 40) + "..." : firstLine;

  return {
    title: title || "Untitled Adaptation",
    logline: `An AI-crafted cinematic adaptation based on: "${trimmed.slice(0, 120)}${trimmed.length > 120 ? "..." : ""}"`,
    duration_estimate: "~3–5 minutes (estimated)",
    scenes: [
      {
        scene_number: 1,
        location: "INT/EXT. OPENING SCENE — DAY",
        visual_description: `The world of "${trimmed.slice(0, 60)}" comes to life. Camera establishes the setting with a wide master shot. Characters are introduced through deliberate composition — we learn who they are through what they do, not what they say. The atmosphere is thick with anticipation.`,
        dialogue: [
          {
            character: "NARRATOR (V.O.)",
            line: `This is the story of ${trimmed.slice(0, 80)}${trimmed.length > 80 ? "..." : ""}. A tale that begins now.`,
          },
        ],
        cinematic_notes:
          "Opening shot: wide, establishing. Naturalistic lighting. Let the environment breathe. Score starts sparse — a single instrument, waiting.",
      },
      {
        scene_number: 2,
        location: "CONTINUOUS",
        visual_description:
          "The central conflict crystallizes. Our protagonist faces a decision that will define everything that follows. The camera pushes in slowly — the world around them seems to fall away. Every detail in the frame reinforces the stakes.",
        dialogue: [
          {
            character: "PROTAGONIST",
            line: "This is the moment everything changes. There's no turning back now.",
          },
          {
            character: "COMPANION",
            line: "Then we go forward. Together.",
          },
        ],
        cinematic_notes:
          "Dolly push-in on the protagonist. Shallow depth of field — background blurs as the moment intensifies. Score builds with percussive heartbeat rhythm.",
      },
      {
        scene_number: 3,
        location: "CLIMAX LOCATION — MAGIC HOUR",
        visual_description:
          "The decisive confrontation. Visual poetry — light and shadow tell as much story as any line. The scene unfolds in a series of precise, deliberate compositions. Movement is choreographed like a dance. The outcome hangs in a single suspended breath.",
        dialogue: [
          {
            character: "ANTAGONIST / FORCE",
            line: "You think you can change what's written? The story was decided long before you arrived.",
          },
          {
            character: "PROTAGONIST",
            line: "Then I'll write a new one.",
          },
        ],
        cinematic_notes:
          "Peak visual drama. Cross-cutting between faces. The final exchange should be in extreme close-up. Score reaches its crescendo — then cuts to silence for the decisive beat. Ring the emotional bell.",
      },
    ],
  };
}

// ── Server function ──

export const generateScript = createServerFn()
  .validator((data: unknown) => {
    const { prompt } = data as { prompt?: string };
    return { prompt: prompt?.trim() || "" };
  })
  .handler(async ({ data }) => {
    // Simulate a brief processing delay for UX (shows progress)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let script: Script;

    if (
      !data.prompt ||
      data.prompt.toLowerCase().includes("odyssey") ||
      data.prompt.toLowerCase().includes("cyclops") ||
      data.prompt.toLowerCase().includes("odysseus") ||
      data.prompt.toLowerCase().includes("polyphemus") ||
      data.prompt.toLowerCase().includes("siren") ||
      data.prompt.toLowerCase().includes("ithaca")
    ) {
      // Return the pre-crafted Odyssey masterpiece
      script = ODYSSEY_CYCLOPS;
    } else {
      // Adapt custom prompt via template
      script = adaptCustomPrompt(data.prompt);
    }

    // Store for next pipeline stages
    lastScript = script;

    return script;
  });
