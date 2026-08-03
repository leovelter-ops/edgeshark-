// ---------------------------------------------------------------------------
// Academy: folder / category / lesson model. Users build their own library of
// course folders (each with an image + category) and drop lessons inside.
// Everything lives in localStorage, mirroring the Sanctuary toolkit pattern.
// Video URL helpers are shared from the sanctuary lib.
// ---------------------------------------------------------------------------

export const FOLDERS_KEY = "edgeflo_academy_folders";
export const LESSONS_KEY = "edgeflo_academy_lessons";

/** A course/resource folder. */
export interface AcademyFolder {
  id: string;
  name: string;
  /** cover image — an http(s) URL or a (downscaled) data URL */
  image: string;
  category: string;
  created_at: number;
}

/** A lesson inside a folder. */
export interface AcademyLesson {
  id: string;
  folderId: string;
  name: string;
  url: string;
  subtitle: string;
  description: string;
  created_at: number;
}

/** Fallback folder cover when none was picked. */
export const FOLDER_PLACEHOLDER =
  "linear-gradient(135deg, #2563eb 0%, #5b8bff 100%)";

/**
 * Read a picked image file and return a downscaled data URL so it stays small
 * enough to keep in localStorage. Falls back to the raw data URL if the canvas
 * pipeline is unavailable.
 */
export function fileToScaledDataUrl(
  file: File,
  maxW = 640,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const raw = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(raw);
      img.onload = () => {
        try {
          const scale = Math.min(1, maxW / img.width);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(raw);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch {
          resolve(raw);
        }
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
