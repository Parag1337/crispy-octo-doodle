import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "default" | "large";
}

const Modal = ({ open, title, children, onClose, size = "default" }: ModalProps) => {
  if (!open) return null;

  const maxWidthClass = size === "large" ? "max-w-5xl" : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--bg-0)]/80 p-4 backdrop-blur-md">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close modal backdrop"
        onClick={onClose}
      />
      <div className={`glass-panel relative w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-[24px] border border-[var(--border)] text-[var(--text-body)] p-6 shadow-card md:p-8`}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--primary)] font-semibold">Workspace dialog</p>
            <h2 className="mt-2 text-xl font-bold text-[var(--text-strong)] md:text-2xl">{title}</h2>
          </div>
          <button className="rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-3 py-1 text-lg leading-none text-[var(--text-muted)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
