import { useEffect, useRef, useState } from "react";
import type { BoardDate } from "../data/mock";
import type { TripWorkspaceData } from "../data/travel";
import { useI18n } from "../i18n/LanguageContext";
import { TravelWorkspace } from "./TravelWorkspace";

const inlineComputedStyles = (source: HTMLElement, clone: HTMLElement) => {
  const sourceElements = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))];
  const cloneElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];

  sourceElements.forEach((element, index) => {
    const clonedElement = cloneElements[index];
    if (!clonedElement) return;
    const computed = window.getComputedStyle(element);
    const styles = Array.from(computed).map(property => `${property}:${computed.getPropertyValue(property)};`).join("");
    clonedElement.setAttribute("style", styles);

    if (element instanceof HTMLInputElement && clonedElement instanceof HTMLInputElement) {
      clonedElement.setAttribute("value", element.value);
      if (element.checked) clonedElement.setAttribute("checked", "checked");
      else clonedElement.removeAttribute("checked");
    }
  });
};

const removeShareControls = (clone: HTMLElement) => {
  clone.querySelectorAll([
    ".simple-item-delete",
    ".cell-add-item",
    ".inline-text-editor",
    ".completion-toggle",
    ".view-tabs",
  ].join(",")).forEach(element => element.remove());

  clone.querySelectorAll<HTMLElement>(".simple-item-row").forEach(row => {
    row.style.gridTemplateColumns = "minmax(0, 1fr)";
  });
};

const renderWorkspacePng = async (source: HTMLElement) => {
  await document.fonts.ready;
  const width = Math.ceil(Math.max(source.scrollWidth, source.getBoundingClientRect().width));
  const height = Math.ceil(Math.max(source.scrollHeight, source.getBoundingClientRect().height));
  const clone = source.cloneNode(true) as HTMLElement;
  inlineComputedStyles(source, clone);
  removeShareControls(clone);
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.margin = "0";
  clone.style.position = "static";
  clone.style.left = "auto";
  clone.style.top = "auto";
  clone.style.zIndex = "auto";
  clone.style.transform = "none";
  clone.style.overflow = "visible";

  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${serialized}</div></foreignObject></svg>`;
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = new Image();
  image.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Workspace image rendering failed"));
    image.src = svgUrl;
  });

  const scale = Math.min(2, 8192 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.scale(scale, scale);
  context.drawImage(image, 0, 0, width, height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG generation failed")), "image/png", 1);
  });
};

export function WorkspaceShare({
  data,
  dates,
  tripName,
  requestId,
  onComplete,
}: {
  data: TripWorkspaceData;
  dates: BoardDate[];
  tripName: string;
  requestId: number;
  onComplete: () => void;
}) {
  const { t } = useI18n();
  const sourceRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!requestId || !sourceRef.current) return;
    let active = true;
    setError("");

    void renderWorkspacePng(sourceRef.current)
      .then(blob => {
        if (!active) return;
        setImageUrl(current => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
      })
      .catch(() => { if (active) setError(t("share_generation_failed")); })
      .finally(() => { if (active) onComplete(); });

    return () => { active = false; };
  }, [onComplete, requestId, t]);

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  const closePreview = () => {
    setImageUrl(current => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    setError("");
  };

  const safeName = tripName.replace(/[\\/:*?"<>|]/g, "-");

  return <>
    <div className="workspace-share-source" ref={sourceRef} aria-hidden="true">
      <TravelWorkspace data={data} dates={dates} onDataChange={() => undefined} onOpenDaily={() => undefined} />
    </div>

    {(imageUrl || error) && <div className="share-preview-backdrop" role="dialog" aria-modal="true" aria-label={t("share_preview")}>
      <div className="share-preview-panel">
        <div className="share-preview-head"><b>{t("share_preview")}</b><button onClick={closePreview} aria-label={t("close")}>×</button></div>
        {imageUrl ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={t("workspace_long_image", { name: tripName })} />
        </> : <p>{error}</p>}
        <div className="share-preview-actions">
          <button onClick={closePreview}>{t("close")}</button>
          {imageUrl && <a href={imageUrl} download={`${safeName}-${t("travel_plan")}.png`}>{t("save_image")}</a>}
        </div>
      </div>
    </div>}
  </>;
}
