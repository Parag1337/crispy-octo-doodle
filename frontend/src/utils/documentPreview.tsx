import type { ProjectDocument } from "../types/group.types";

const baseApiUrl =
  import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ?? "http://localhost:5501";

const officePreviewMimeTypes = new Set([
  "application/msword",
  "application/vnd.ms-word.document.macroenabled.12",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "application/vnd.ms-powerpoint.addin.macroenabled.12",
  "application/vnd.ms-powerpoint.presentation.macroenabled.12",
  "application/vnd.ms-excel.sheet.macroenabled.12",
]);

const textPreviewMimeTypes = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/xhtml+xml",
]);

export const getDocumentUrl = (doc: ProjectDocument): string =>
  `${baseApiUrl}/uploads/documents/${doc.filename}`;

export type DocumentPreviewMode = "pdf" | "image" | "office" | "text" | "unsupported";

const isOfficePreviewSupported = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1" &&
      !parsed.hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
};

export const getDocumentPreviewMode = (doc: ProjectDocument): DocumentPreviewMode => {
  const mime = doc.mimeType.toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (officePreviewMimeTypes.has(mime)) {
    return isOfficePreviewSupported(getDocumentUrl(doc)) ? "office" : "unsupported";
  }
  if (mime.startsWith("text/") || textPreviewMimeTypes.has(mime)) return "text";
  return "unsupported";
};

export const getDocumentPreviewSrc = (doc: ProjectDocument): string => {
  const url = getDocumentUrl(doc);
  return getDocumentPreviewMode(doc) === "office"
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : url;
};

interface DocumentPreviewProps {
  document: ProjectDocument;
}

export const DocumentPreview = ({ document }: DocumentPreviewProps) => {
  const mode = getDocumentPreviewMode(document);
  const src = getDocumentPreviewSrc(document);

  if (mode === "image") {
    return (
      <img
        src={src}
        alt={document.originalName}
        className="mx-auto max-h-[75vh] w-full max-w-full rounded-xl object-contain"
      />
    );
  }

  if (mode === "pdf" || mode === "office" || mode === "text") {
    return (
      <iframe
        src={src}
        title={document.originalName}
        className="h-[75vh] w-full rounded-xl border border-[var(--border)]"
      />
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-1)]/70 p-4 text-sm text-[var(--text-body)]">
      <p>Preview not available for this file type.</p>
      <a
        href={getDocumentUrl(document)}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-semibold text-[var(--primary)] hover:underline"
      >
        Download document
      </a>
    </div>
  );
};
