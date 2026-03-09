// @system — changelog page: displays product updates and release notes
// @custom — auto-generated from completed tasks via /api/changelog
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Settings, Shield, CreditCard, Activity, Key, FileText, Star, Zap, Bug, Plus, Sparkles, Loader2 } from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { Sidebar, SidebarLogo, SidebarSection, SidebarItem } from '../../../components/@system/Sidebar/Sidebar'
import { useAuthContext } from '../../../store/@system/auth'
import { info } from '@/config/@system/info'
import { cn } from '@/app/lib/@system/utils'
import { api } from '@/app/lib/@system/api'

const NAV_ITEMS = [
  { icon: Home, label: 'Dashboard', to: '/app' },
  { icon: FileText, label: 'Changelog', to: '/app/changelog' },
  { icon: Activity, label: 'Activity', to: '/app/activity' },
  { icon: CreditCard, label: 'Billing', to: '/app/billing' },
  { icon: Key, label: 'API Keys', to: '/app/api-keys' },
  { icon: Settings, label: 'Settings', to: '/app/settings' },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type ChangeType = 'feature' | 'improvement' | 'fix' | 'breaking'

interface Change {
  id: number
  type: ChangeType
  task_type: string
  text: string
  description: string | null
  product: string | null
  completed_at: string
}

interface ChangelogEntry {
  week_start: string
  week_end: string
  title: string
  changes: Change[]
}

interface ChangelogResponse {
  entries: ChangelogEntry[]
  pagination: { total: number; limit: number; offset: number }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChangeTypeBadge({ type }: { type: ChangeType }) {
  const config = {
    feature: {
      icon: Plus,
      label: 'New',
      className: 'bg-green-500/15 text-green-600 border-green-500/20',
    },
    improvement: {
      icon: Sparkles,
      label: 'Improved',
      className: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
    },
    fix: {
      icon: Bug,
      label: 'Fixed',
      className: 'bg-orange-500/15 text-orange-600 border-orange-500/20',
    },
    breaking: {
      icon: Zap,
      label: 'Breaking',
      className: 'bg-red-500/15 text-red-600 border-red-500/20',
    },
  }

  const { icon: Icon, label, className } = config[type] ?? config.improvement

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function ChangelogEntryCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      {/* Week badge */}
      <div className="absolute -top-3 left-6 flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-primary shadow-sm">
        <Star className="h-3.5 w-3.5" />
        {entry.title}
      </div>

      {/* Date range */}
      <p className="mb-2 mt-2 text-sm text-muted-foreground">
        {new Date(entry.week_start).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
        })}
        {' – '}
        {new Date(entry.week_end).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>

      {/* Changes list */}
      <ul className="space-y-2.5">
        {entry.changes.map((change) => (
          <li key={change.id} className="flex items-start gap-3">
            <ChangeTypeBadge type={change.type} />
            <div className="flex-1 pt-0.5">
              <span className="text-sm font-medium leading-relaxed">{change.text}</span>
              {change.product && (
                <span className="ml-2 inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {change.product}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EmptyChangelog() {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
      <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
      <h2 className="mb-2 text-lg font-semibold">No changelog entries yet</h2>
      <p className="text-sm text-muted-foreground">
        Completed tasks will automatically appear here as changelog entries.
        Mark a task as done to generate the first entry.
      </p>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ChangelogPage() {
  const { user } = useAuthContext()
  const location = useLocation()
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchChangelog() {
      try {
        setLoading(true)
        setError(null)
        const data = await api.get<ChangelogResponse>('/changelog')
        if (!cancelled) {
          setEntries(data.entries)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load changelog')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchChangelog()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <Sidebar>
          <SidebarLogo name={info.name} />
          <SidebarSection>
            {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
              <Link to={to} key={to}>
                <SidebarItem
                  icon={<Icon className="h-4 w-4" />}
                  label={label}
                  active={location.pathname === to}
                />
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link to="/app/admin">
                <SidebarItem
                  icon={<Shield className="h-4 w-4" />}
                  label="Admin"
                  active={location.pathname === '/app/admin'}
                />
              </Link>
            )}
          </SidebarSection>
        </Sidebar>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-auto bg-gradient-to-b from-background to-muted/20 p-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Changelog</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Stay up to date with new features, improvements, and bug fixes.
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="mx-auto flex max-w-3xl items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && entries.length === 0 && <EmptyChangelog />}

          {/* Changelog entries */}
          {!loading && !error && entries.length > 0 && (
            <div className="mx-auto max-w-3xl space-y-8">
              {entries.map((entry) => (
                <ChangelogEntryCard key={entry.week_start} entry={entry} />
              ))}
            </div>
          )}

          {/* Footer CTA */}
          <div className="mx-auto mt-12 max-w-3xl rounded-lg border border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Have a feature request or found a bug?{' '}
              <Link to="/contact" className="font-medium text-primary hover:underline">
                Let us know
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
