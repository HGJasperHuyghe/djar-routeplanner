interface ErrorBannerProps {
  message: string | null;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-3 rounded border border-error/30 bg-error-container/60 px-4 py-3 text-body-md text-on-error-container">
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-label-sm font-heading uppercase tracking-wide text-error hover:underline"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
