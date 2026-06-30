import { Badge } from './ui'

/** Neutral empty-state for nav modules that don't have a dedicated screen yet. */
export default function Placeholder({ title, group }: { title: string; group?: string }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl border border-border-dark bg-surface text-content-muted">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18 M8 4v5 M8 14h8 M8 17h5" />
        </svg>
      </div>
      <div className="text-[17px] font-semibold text-content">{title}</div>
      <p className="max-w-md text-[13px] leading-relaxed text-content-muted">
        {group ? <span className="text-content-muted">{group} · </span> : null}
        This module is part of the TRADENET&nbsp;X redesign and will surface live{' '}
        {title.toLowerCase()} data here, using the same tables, filters and saved views as the rest of the dashboard.
      </p>
      <Badge tone="info">Planned module</Badge>
    </div>
  )
}
