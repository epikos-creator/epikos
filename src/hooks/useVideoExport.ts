"use client";

import { useRef, useCallback, useState } from "react";
import type { Script, Scene } from "~/server/generate-script";

interface VideoExportState {
  status: "idle" | "recording" | "processing" | "done" | "error";
  progress: number;
  error?: string;
  blob?: Blob;
}

/**
 * Renders scenes to canvas + captures via MediaRecorder to produce a .webm film.
 * Uses scene images drawn on canvas with cinematic overlays, timed to match
 * scene durations. Includes title card, scene transitions, and end credits.
 * Audio is captured from a generated AudioContext tone track.
 */
export function useVideoExport(script: Script | null) {
  const [exportState, setExportState] = useState<VideoExportState>({
    status: "idle",
    progress: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const abortRef = useRef(false);

  const sceneImage = useCallback((sceneNumber: number): string => {
    const idx = ((sceneNumber - 1) % 6) + 1;
    return `/images/odyssey-${idx}.png`;
  }, []);

  const exportVideo = useCallback(async () => {
    if (!script || script.scenes.length === 0) return;
    
    // Capture script in a local constant for type narrowing
    const s = script;

    abortRef.current = false;
    setExportState({ status: "recording", progress: 0 });
    chunksRef.current = [];

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d")!;

    // Create audio context for film audio
    const audioCtx = new AudioContext();
    const audioDest = audioCtx.createMediaStreamDestination();

    // Combined stream
    const canvasStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks(),
    ]);

    // MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 2500000,
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setExportState({ status: "done", progress: 100, blob });
    };

    recorder.onerror = () => {
      setExportState({ status: "error", progress: 0, error: "Recording failed" });
    };

    recorder.start(100);

    // ── Render each scene frame by frame ──
    const sceneDurationMs = 4000; // 4 seconds per scene
    const titleCardDurationMs = 3000; // 3 sec title card
    const creditsDurationMs = 3500; // 3.5 sec credits
    const transitionDurationMs = 800; // 0.8 sec crossfade between scenes
    const frameInterval = 1000 / 30; // 30 fps

    const totalScenes = s.scenes.length;
    // Total "segments": title + scenes + transitions between scenes + credits
    const totalSegments = 1 + totalScenes + (totalScenes > 0 ? totalScenes - 1 : 0) + 1;
    const estimatedTotalMs = titleCardDurationMs + totalScenes * sceneDurationMs + 
      (totalScenes > 0 ? (totalScenes - 1) * transitionDurationMs : 0) + creditsDurationMs;

    // Load all scene images
    const imageCache = new Map<number, HTMLImageElement>();
    const loadImage = (sceneNum: number): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imageCache.set(sceneNum, img);
          resolve(img);
        };
        img.onerror = () => reject(new Error(`Failed to load scene ${sceneNum} image`));
        img.src = sceneImage(sceneNum);
      });
    };

    try {
      // Preload images
      await Promise.all(
        s.scenes.map((sc) => loadImage(sc.scene_number))
      );
    } catch (err: any) {
      setExportState({ status: "error", progress: 0, error: err?.message || "Image load failed" });
      recorder.stop();
      audioCtx.close();
      return;
    }

    // ── Drawing functions ──
    
    // Clear and fill background
    function fillBackground() {
      const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
      grad.addColorStop(0, "#1a1a2e");
      grad.addColorStop(1, "#0d0d1a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1920, 1080);
    }
    
    // Draw title card
    function drawTitleCard(progress: number) {
      fillBackground();
      const alpha = Math.min(1, progress * 2); // fade in
      
      ctx.globalAlpha = alpha;
      
      // Logo area
      ctx.fillStyle = "#d1a95c";
      ctx.beginPath();
      ctx.arc(960, 300, 60, 0, Math.PI * 2);
      ctx.fill();
      
      // "Epikos Presents" badge
      ctx.fillStyle = "#d1a95c";
      ctx.font = "600 20px Cinzel, serif";
      ctx.textAlign = "center";
      ctx.fillText("EPIKOS PRESENTS", 960, 440);
      
      // Decorative line
      ctx.strokeStyle = "rgba(209,169,92,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(660, 480);
      ctx.lineTo(1260, 480);
      ctx.stroke();
      
      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 64px Cinzel, serif";
      ctx.fillText("THE ODYSSEY", 960, 580);
      
      // Subtitle
      ctx.fillStyle = "#d1a95c";
      ctx.font = "bold 36px Cinzel, serif";
      ctx.fillText(s.title, 960, 650);
      
      // Logline
      ctx.fillStyle = "rgba(200,200,200,0.8)";
      ctx.font = "italic 18px Inter, serif";
      const words = s.logline.split(" ");
      let line = "";
      let y = 730;
      for (const word of words) {
        const test = line + word + " ";
        if (ctx.measureText(test).width > 800) {
          ctx.fillText(line.trim(), 960, y);
          line = word + " ";
          y += 28;
        } else {
          line = test;
        }
      }
      if (line.trim()) ctx.fillText(line.trim(), 960, y);
      
      // Bottom gradient
      const bottomGrad = ctx.createLinearGradient(0, 800, 0, 1080);
      bottomGrad.addColorStop(0, "rgba(26,26,46,0)");
      bottomGrad.addColorStop(1, "rgba(26,26,46,1)");
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, 800, 1920, 280);
      
      ctx.globalAlpha = 1;
    }
    
    // Draw end credits
    function drawCredits(progress: number) {
      fillBackground();
      const scrollY = progress * 200; // scroll up
      
      ctx.fillStyle = "rgba(209,169,92,0.6)";
      ctx.font = "600 14px Cinzel, serif";
      ctx.textAlign = "center";
      ctx.fillText("AN EPIKOS PRODUCTION", 960, 400 - scrollY);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px Cinzel, serif";
      ctx.fillText(s.title, 960, 460 - scrollY);
      
      ctx.fillStyle = "rgba(180,180,180,0.8)";
      ctx.font = "16px Inter, serif";
      ctx.fillText("Adapted from The Odyssey by Homer", 960, 500 - scrollY);
      
      // Divider
      ctx.strokeStyle = "rgba(209,169,92,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(760, 530 - scrollY);
      ctx.lineTo(1160, 530 - scrollY);
      ctx.stroke();
      
      ctx.fillStyle = "rgba(209,169,92,0.8)";
      ctx.font = "600 14px Cinzel, serif";
      ctx.fillText("CAST & CREW", 960, 570 - scrollY);
      
      const credits = [
        "Odysseus — AI Voice Synthesis",
        "Polyphemus — AI Voice Synthesis",
        "Eurylochus — AI Voice Synthesis",
        "",
        "Original Score — Web Audio Orchestra",
        "Directed by — Artificial Intelligence",
        "",
        `Created with EPIKOS — AI-Powered Filmmaking`,
        `${s.scenes.length} scenes · ${s.duration_estimate}`,
      ];
      
      ctx.fillStyle = "rgba(180,180,180,0.7)";
      ctx.font = "14px Inter, serif";
      credits.forEach((line, i) => {
        ctx.fillText(line, 960, 620 + i * 28 - scrollY);
      });
    }

    // Draw function for a single scene
    function drawScene(scene: Scene, progress: number, alpha: number = 1) {
      ctx.clearRect(0, 0, 1920, 1080);
      
      ctx.globalAlpha = alpha;

      const img = imageCache.get(scene.scene_number);
      if (img) {
        // Draw image with slight scale animation
        const scale = 1 + progress * 0.05;
        const iw = 1920 * scale;
        const ih = 1080 * scale;
        const ix = (1920 - iw) / 2;
        const iy = (1080 - ih) / 2;
        ctx.drawImage(img, ix, iy, iw, ih);
      } else {
        // Fallback gradient
        fillBackground();
      }

      // Vignette
      const vignetteGrad = ctx.createRadialGradient(960, 540, 400, 960, 540, 1100);
      vignetteGrad.addColorStop(0, "rgba(0,0,0,0)");
      vignetteGrad.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, 1920, 1080);

      // Scene number badge
      ctx.fillStyle = "rgba(209,169,92,0.25)";
      ctx.beginPath();
      ctx.roundRect(60, 60, 80, 80, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(209,169,92,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#d1a95c";
      ctx.font = "bold 36px Cinzel, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(scene.scene_number), 100, 100);

      // Scene location
      ctx.fillStyle = "#d1a95c";
      ctx.font = "600 22px Cinzel, serif";
      ctx.textAlign = "left";
      ctx.fillText(scene.location.toUpperCase(), 170, 100);

      // Bottom info bar
      const barY = 1080 - 100;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, barY, 1920, 100);

      ctx.fillStyle = "#d1a95c";
      ctx.font = "600 16px Cinzel, serif";
      ctx.fillText(`EPIKOS PRESENTS  ·  ${s.title}  ·  Scene ${scene.scene_number}/${s.scenes.length}`, 40, barY + 55);

      // Progress bar at bottom
      const sceneIdx = s.scenes.indexOf(scene);
      const barProgress = (sceneIdx + progress) / s.scenes.length;
      ctx.fillStyle = "rgba(209,169,92,0.3)";
      ctx.fillRect(0, barY - 4, 1920 * barProgress, 4);
      
      ctx.globalAlpha = 1;
    }

    // Play audio tones for each scene (simple orchestral stabs)
    function playSceneTone(sceneIdx: number) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      // Different note per scene for variety
      const notes = [146.83, 174.61, 220.0, 196.0, 164.81, 146.83, 174.61];
      osc.frequency.value = notes[sceneIdx % notes.length];
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(audioDest);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.5);
    }

    // ── Render loop with title card → scenes (with transitions) → credits ──
    let elapsedMs = 0;
    
    // Helper: render frames for a given duration with a draw callback
    async function renderFrames(
      durationMs: number,
      drawFn: (progress: number) => void,
    ) {
      const totalFrames = Math.floor(durationMs / frameInterval);
      for (let f = 0; f < totalFrames; f++) {
        if (abortRef.current) return false;
        const progress = f / totalFrames;
        drawFn(progress);
        
        const overallProgress = Math.round((elapsedMs / estimatedTotalMs) * 100);
        elapsedMs += frameInterval;
        setExportState((prev) =>
          prev.status === "recording" ? { ...prev, progress: Math.min(overallProgress, 99) } : prev
        );
        
        await new Promise<void>((resolve) => setTimeout(resolve, frameInterval));
      }
      return true;
    }
    
    // 1. Title Card
    if (!(await renderFrames(titleCardDurationMs, drawTitleCard))) {
      recorder.stop(); audioCtx.close(); return;
    }
    
    // 2. Scenes with transitions
    for (let sIdx = 0; sIdx < totalScenes; sIdx++) {
      if (abortRef.current) break;
      
      const scene = s.scenes[sIdx];
      playSceneTone(sIdx);
      
      // Draw the scene
      if (!(await renderFrames(sceneDurationMs, (p) => drawScene(scene, p, 1)))) {
        recorder.stop(); audioCtx.close(); return;
      }
      
      // Transition to next scene (if not last)
      if (sIdx < totalScenes - 1) {
        const nextScene = s.scenes[sIdx + 1];
        // Crossfade: draw current scene fading out and next scene fading in
        const transitionFrames = Math.floor(transitionDurationMs / frameInterval);
        for (let f = 0; f < transitionFrames; f++) {
          if (abortRef.current) break;
          const t = f / transitionFrames;
          ctx.clearRect(0, 0, 1920, 1080);
          // Draw fading-out current scene
          drawScene(scene, 1, 1 - t);
          // Draw fading-in next scene on top
          ctx.globalCompositeOperation = "source-over";
          const nextAlpha = t;
          // Draw next scene with alpha
          const nextImg = imageCache.get(nextScene.scene_number);
          if (nextImg) {
            ctx.globalAlpha = nextAlpha;
            ctx.drawImage(nextImg, 0, 0, 1920, 1080);
            ctx.globalAlpha = 1;
          }
          
          const overallProgress = Math.round((elapsedMs / estimatedTotalMs) * 100);
          elapsedMs += frameInterval;
          setExportState((prev) =>
            prev.status === "recording" ? { ...prev, progress: Math.min(overallProgress, 99) } : prev
          );
          
          await new Promise<void>((resolve) => setTimeout(resolve, frameInterval));
        }
      }
    }
    
    // 3. End Credits
    if (!abortRef.current) {
      await renderFrames(creditsDurationMs, drawCredits);
    }

    setExportState((prev) =>
      prev.status === "recording" ? { ...prev, progress: 100 } : prev
    );

    if (!abortRef.current) {
      // Hold last frame briefly
      await new Promise((r) => setTimeout(r, 500));
    }

    recorder.stop();
    audioCtx.close();
  }, [script, sceneImage]);

  const cancelExport = useCallback(() => {
    abortRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setExportState({ status: "idle", progress: 0 });
  }, []);

  const downloadVideo = useCallback(() => {
    if (!exportState.blob) return;
    const url = URL.createObjectURL(exportState.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `epikos_${script?.title?.replace(/\s+/g, "_") || "film"}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportState.blob, script]);

  return { exportState, exportVideo, cancelExport, downloadVideo };
}
