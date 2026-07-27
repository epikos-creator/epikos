"use client";

import { useRef, useCallback, useState } from "react";
import type { Script, Scene } from "~/routes/api/generate-script";

interface VideoExportState {
  status: "idle" | "recording" | "processing" | "done" | "error";
  progress: number;
  error?: string;
  blob?: Blob;
}

/**
 * Renders scenes to canvas + captures via MediaRecorder to produce a .webm film.
 * Uses scene images drawn on canvas with cinematic overlays, timed to match
 * scene durations. Audio is captured from a generated AudioContext tone track.
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
    const frameInterval = 1000 / 30; // 30 fps

    const totalScenes = script.scenes.length;

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
        script.scenes.map((s) => loadImage(s.scene_number))
      );
    } catch (err: any) {
      setExportState({ status: "error", progress: 0, error: err?.message || "Image load failed" });
      recorder.stop();
      audioCtx.close();
      return;
    }

    // Draw function for a single scene
    function drawScene(scene: Scene, progress: number) {
      ctx.clearRect(0, 0, 1920, 1080);

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
        const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
        grad.addColorStop(0, "#1a1a2e");
        grad.addColorStop(1, "#0d0d1a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1920, 1080);
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
      ctx.fillText(`EPIKOS PRESENTS  ·  ${script.title}  ·  Scene ${scene.scene_number}/${script.scenes.length}`, 40, barY + 55);

      // Progress bar at bottom
      const barProgress = (script.scenes.indexOf(scene) + progress) / script.scenes.length;
      ctx.fillStyle = "rgba(209,169,92,0.3)";
      ctx.fillRect(0, barY - 4, 1920 * barProgress, 4);
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

    // Render loop
    for (let sIdx = 0; sIdx < totalScenes; sIdx++) {
      if (abortRef.current) break;

      const scene = script.scenes[sIdx];
      playSceneTone(sIdx);

      const totalFrames = Math.floor(sceneDurationMs / frameInterval);
      for (let f = 0; f < totalFrames; f++) {
        if (abortRef.current) break;
        const progress = f / totalFrames;
        drawScene(scene, progress);

        // Update progress
        const overallProgress = Math.round(
          ((sIdx + progress) / totalScenes) * 100
        );
        setExportState((prev) =>
          prev.status === "recording" ? { ...prev, progress: overallProgress } : prev
        );

        await new Promise<void>((resolve) => {
          setTimeout(resolve, frameInterval);
        });
      }
    }

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
