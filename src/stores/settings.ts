import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  falApiKey: string;
  setFalApiKey: (key: string) => void;
  selectedImageModel: string;
  setSelectedImageModel: (id: string) => void;
  selectedVideoModel: string;
  setSelectedVideoModel: (id: string) => void;
  selectedFormat: string;
  setSelectedFormat: (id: string) => void;
  imageQuality: string;
  setImageQuality: (q: string) => void;
  sceneDuration: number;
  setSceneDuration: (s: number) => void;
  totalDuration: number;
  setTotalDuration: (s: number) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      falApiKey: "",
      setFalApiKey: (key) => set({ falApiKey: key }),
      selectedImageModel: "fal-ai/flux/schnell",
      setSelectedImageModel: (id) => set({ selectedImageModel: id }),
      selectedVideoModel: "fal-ai/kling-video/v1.6/standard/text-to-video",
      setSelectedVideoModel: (id) => set({ selectedVideoModel: id }),
      selectedFormat: "landscape_16_9",
      setSelectedFormat: (id) => set({ selectedFormat: id }),
      imageQuality: "1k",
      setImageQuality: (q) => set({ imageQuality: q }),
      sceneDuration: 5,
      setSceneDuration: (s) => set({ sceneDuration: s }),
      totalDuration: 10,
      setTotalDuration: (s) => set({ totalDuration: s }),
    }),
    { name: "videoforge-settings" },
  ),
);