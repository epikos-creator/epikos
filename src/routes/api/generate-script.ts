import { createServerFn } from "@tanstack/react-start";

// ── Type definitions ──

export interface Scene {
  scene_number: number;
  location: string;
  visual_description: string;
  dialogue: Array<{ character: string; line: string }>;
  cinematic_notes: string;
}

export interface Script {
  title: string;
  logline: string;
  scenes: Scene[];
  duration_estimate: string;
}

// ── In-memory store for the last generated script (for next pipeline stages) ──

let lastScript: Script | null = null;

export function getLastScript(): Script | null {
  return lastScript;
}

// ── The Odyssey demo — a pre-crafted cinematic masterpiece ──

const ODYSSEY_CYCLOPS: Script = {
  title: "The Cyclops",
  logline:
    "Trapped in the cave of a man-eating giant, the cunning Odysseus must outwit a monster ten times his size — or watch his crew be devoured one by one.",
  duration_estimate: "~6 minutes",
  scenes: [
    {
      scene_number: 1,
      location: "EXT. POLYPHEMUS'S ISLAND — DAY",
      visual_description:
        "A rugged, sun-bleached island rises from the wine-dark Aegean. A Greek trireme rests in a hidden cove. Odysseus, bronze-skinned and sharp-eyed, leads twelve hand-picked men up a goat path through twisted olive trees. The camera PANS across wild cyclamen and thyme as seabirds wheel overhead. The men carry a goatskin of dark wine — a gift from a priest of Apollo.",
      dialogue: [
        {
          character: "ODYSSEUS",
          line: "Look at this land, Eurylochus. Untamed. Rich. Whoever dwells here must be blessed by the gods — and generous to travelers.",
        },
        {
          character: "EURYLOCHUS",
          line: "Or cursed, Captain. I don't like the look of that cave mouth up there. It's too... large.",
        },
        {
          character: "ODYSSEUS",
          line: "That's precisely why we go. Large dwellings mean large hospitality. Bring the wine.",
        },
      ],
      cinematic_notes:
        "Shoot in golden-hour light. Steadicam following Odysseus from behind as he crests the ridge. The cave entrance should feel monumental — frame it so the men look ant-sized against the opening. Sound: distant waves, goat bells, wind through rocks.",
    },
    {
      scene_number: 2,
      location: "INT. CYCLOPS'S CAVE — DAY",
      visual_description:
        "The men step into a cavern of impossible scale. Sunlight shafts through cracks in the ceiling, illuminating pens of lambs and kids. Massive wheels of cheese rest on reed mats. Pails of milk line the walls. The floor is littered with bones — some animal, some unmistakably human. A central fire pit still smolders.",
      dialogue: [
        {
          character: "EURYMACHUS",
          line: "Zeus protect us. Look at the size of that cheese wheel. What kind of creature...",
        },
        {
          character: "ODYSSEUS",
          line: "(quietly, examining bones) Men. Sailors like us. He's a shepherd — and we're the flock.",
        },
        {
          character: "EURYMACHUS",
          line: "Let's take the cheese and lambs and go. Now. Before—",
        },
        {
          character: "ODYSSEUS",
          line: "No. We wait. By sacred law, the host must offer gifts. I want to see the face behind this door.",
        },
      ],
      cinematic_notes:
        "Interior: low natural light, shafts of god-rays. Sound design crucial — echoing drips, distant bleating, the men's whispers bouncing off unseen walls. Close-up on Odysseus's hand brushing a femur bone. The score introduces a low, ominous drone (Persian ney flute).",
    },
    {
      scene_number: 3,
      location: "INT. CYCLOPS'S CAVE — DUSK",
      visual_description:
        "The entrance darkens. A thunderous BOOM echoes as a boulder — the size of a house — is rolled across the cave mouth, sealing them in. Polyphemus enters: a mountain of flesh, one great eye in the center of his forehead, skin like weathered stone. He drives his flock inside with a staff the size of a ship's mast. His single eye sweeps the cavern — and stops on the cowering Greeks.",
      dialogue: [
        {
          character: "POLYPHEMUS",
          line: "(voice like falling rocks) Strangers! Who are you? Pirates? Merchants? Or lost souls the sea has vomited onto my shore?",
        },
        {
          character: "ODYSSEUS",
          line: "(stepping forward, composed) We are Achaeans, homeward from Troy, blown off course by Poseidon's wrath. We come as suppliants. Zeus himself protects the stranger and the guest.",
        },
        {
          character: "POLYPHEMUS",
          line: "(laughing, a terrible sound) Zeus? The Cyclopes care nothing for Zeus. We are stronger than your gods, little man.",
        },
      ],
      cinematic_notes:
        "Polyphemus revealed in stages — first his massive hand gripping the boulder, then his silhouette against the dusk sky, finally a slow push-in on his eye as it focuses on Odysseus. The boulder-sealing should shake the frame. Score: deep brass and sub-bass rumble. Make the cave feel like a tomb closing.",
    },
    {
      scene_number: 4,
      location: "INT. CYCLOPS'S CAVE — NIGHT",
      visual_description:
        "Horror unfolds in firelight. Polyphemus seizes two crewmen, dashes their heads against the stone floor like puppies, and devours them raw — limb by limb. The surviving Greeks huddle in the farthest corner, paralyzed with terror. Blood pools on the stone. Odysseus watches, jaw clenched, mind racing. His fingers find the wineskin at his belt.",
      dialogue: [
        {
          character: "POLYPHEMUS",
          line: "(mouth full, grunting) Tomorrow... I'll eat the rest. Sleep well, little morsels.",
        },
        {
          character: "EURYMACHUS",
          line: "(whimpering) We're dead. We're all dead.",
        },
        {
          character: "ODYSSEUS",
          line: "(whispered, intense) Not yet. That wineskin — it's undiluted, strong enough to knock down a god. And that staff of his... sharpen the end. Do it quietly.",
        },
      ],
      cinematic_notes:
        "The killings are brutal but not gratuitous — shoot in flickering firelight with judicious shadow. Focus on the reactions of the crew, especially Odysseus's face as he calculates. The sound of bones cracking should be ASMR-crisp. This is the horror beat before the triumph.",
    },
    {
      scene_number: 5,
      location: "INT. CYCLOPS'S CAVE — NIGHT",
      visual_description:
        "Odysseus approaches the reclining giant, wineskin in hand. The crew's sharpened stake glints in the firelight behind them. Polyphemus, sated and drowsy, accepts the wine. He drinks greedily — cup after cup. His eye grows glassy. His speech slurs. The Greek fire casts dancing shadows on the cavern walls like a chorus of ghosts.",
      dialogue: [
        {
          character: "ODYSSEUS",
          line: "Here, Cyclops. Drink. No mortal wine compares to this — the gift I'd have given you, had you honored the laws of hospitality.",
        },
        {
          character: "POLYPHEMUS",
          line: "(gulping, belching) More! Give me more! And tell me your name, stranger, so I may grant you a gift in return.",
        },
        {
          character: "ODYSSEUS",
          line: "(a beat; then, smooth as oil) My name... is Nobody.",
        },
        {
          character: "POLYPHEMUS",
          line: "(slurring, eyelids heavy) Nobody... I shall eat Nobody last. That is my gift... to you... Nobody...",
        },
      ],
      cinematic_notes:
        "The wine-offering scene should feel like a dark communion. Close-ups on the wine — deep purple, almost black — pouring into a massive wooden bowl. Odysseus's face is a mask of deference; only his eyes betray the steel beneath. As Polyphemus passes out, the score swells with a single sustained note — then silence.",
    },
    {
      scene_number: 6,
      location: "INT. CYCLOPS'S CAVE — NIGHT",
      visual_description:
        "Six men lift the fire-hardened olive stake. They drive it into the Cyclops's single eye with the force of a battering ram. The eye HISSES and POPS like a branding iron plunged into water. Polyphemus SCREAMS — a sound that shakes the very mountain. He claws blindly at the air, overturning milk pails, crushing a pen of lambs. The Greeks scatter into the shadows.",
      dialogue: [
        {
          character: "POLYPHEMUS",
          line: "(screaming) NOBODY! NOBODY IS KILLING ME! HELP ME, BROTHERS!",
        },
        {
          character: "CYCLOPS VOICES",
          line: "(from outside, distant, annoyed) If nobody is hurting you, then shut up and let us sleep!",
        },
        {
          character: "ODYSSEUS",
          line: "(breathless, fierce whisper) To the sheep. Tie yourselves under the rams. Three men per beast. Now!",
        },
      ],
      cinematic_notes:
        "The blinding is the set-piece. Shoot it in slow motion — the stake arcing forward, the men's strained faces, the eye in extreme close-up as the point enters. The sound mix should be overwhelming: the sizzle of burning tissue, the Cyclops's roar, the panicked bleating. Then cut to eerie quiet as the Greeks scramble to the sheep pens. Score: percussion drops out entirely; only a high, keening string remains.",
    },
    {
      scene_number: 7,
      location: "INT. CYCLOPS'S CAVE — DAWN",
      visual_description:
        "First light seeps through the cracks as Polyphemus — blind and in agony — rolls aside the boulder to let his flock out, feeling each sheep's back as it passes. Odysseus, lashed beneath the largest ram, grips the wool with white knuckles. The Cyclops's massive hand passes inches above him. One by one, the Greek-laden sheep shuffle into the grey dawn.",
      dialogue: [
        {
          character: "POLYPHEMUS",
          line: "(stroking the lead ram, mournful) My sweet ram... why are you last today? You always lead the flock. Do you grieve for your master's eye?",
        },
        {
          character: "ODYSSEUS",
          line: "(barely audible, through gritted teeth) Steady... steady...",
        },
      ],
      cinematic_notes:
        "Almost dialogue-free. The tension comes from touch and nearness. Extreme close-ups of the Cyclops's palm passing over Odysseus's face, of wool fibers, of held breath. The sound of the boulder grinding open should feel like salvation. Shoot the exit in a wide shot: tiny figures emerging from darkness into pale blue light. The score returns — a quiet, trembling theme of survival.",
    },
    {
      scene_number: 8,
      location: "EXT. CLIFFSIDE — DAWN",
      visual_description:
        "The crew scrambles aboard their ship, pushing off with desperate urgency. Oars bite the grey water. When they're a safe distance out, Odysseus stands at the prow. Behind him, the blinded Cyclops stumbles to the cliff's edge, hurling boulders blindly into the sea. Geysers erupt around the ship. The crew rows for their lives.",
      dialogue: [
        {
          character: "ODYSSEUS",
          line: "(shouting across the water) Cyclops! If anyone asks who took your eye — tell them it was Odysseus, son of Laertes, sacker of cities, king of Ithaca!",
        },
        {
          character: "EURYMACHUS",
          line: "Captain, are you MAD? He'll sink us!",
        },
        {
          character: "POLYPHEMUS",
          line: "(roaring, arms raised to the heavens) FATHER POSEIDON! HEAR ME! Let Odysseus never reach his home! Or if it is his fate, let him arrive late — a broken man, alone, on a stranger's ship, to find sorrow in his house!",
        },
      ],
      cinematic_notes:
        "Wide shots of the ship vs. the giant on the cliff. The boulder splashes should be massive, drenching the camera lens with spray. Odysseus's famous reveal of his name is his tragic flaw made visual — his pride dooming them all. The curse should feel mythic: the sky darkens, the sea churns, a distant roll of thunder. Final shot: PULL BACK from the tiny ship on the vast, angry sea. FADE TO BLACK.",
    },
  ],
};

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
