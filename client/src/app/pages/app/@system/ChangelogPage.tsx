// @system — changelog page: displays product updates and release notes
// @custom — update CHANGELOG_ENTRIES with your actual updates
import { Link, useLocation } from 'react-router-dom'
import { Home, Settings, Shield, CreditCard, Activity, Key, FileText, Star, Zap, Bug, Plus, Sparkles } from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { Sidebar, SidebarLogo, SidebarSection, SidebarItem } from '../../../components/@system/Sidebar/Sidebar'
import { useAuthContext } from '../../../store/@system/auth'
import { info } from '@/config/@system/info'
import { cn } from '@/app/lib/@system/utils'

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

interface ChangelogEntry {
  version: string
  date: string
  title: string
  description?: string
  changes: Array<{
    type: ChangeType
    text: string
  }>
}

// ─── Mock Data (replace with real changelog from API or CMS) ────────────────

const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2024-03-01',
    title: 'Enhanced Dashboard & New Features',
    description: 'Major improvements to the dashboard experience with new analytics and insights.',
    changes: [
      { type: 'feature', text: 'Added real-time analytics dashboard with interactive charts' },
      { type: 'feature', text: 'New collaboration tools for team workspaces' },
      { type: 'improvement', text: 'Improved page load performance by 40%' },
      { type: 'fix', text: 'Fixed issue with CSV export on large datasets' },
    ],
  },
  {
    version: '1.1.5',
    date: '2024-02-15',
    title: 'Bug Fixes & Performance',
    changes: [
      { type: 'fix', text: 'Resolved authentication timeout issue on mobile devices' },
      { type: 'fix', text: 'Fixed sidebar navigation state persistence' },
      { type: 'improvement', text: 'Enhanced search algorithm for faster results' },
    ],
  },
  {
    version: '1.1.0',
    date: '2024-02-01',
    title: 'API Keys & Integrations',
    description: 'Powerful new API management tools and third-party integrations.',
    changes: [
      { type: 'feature', text: 'Introduced API key management with scoped permissions' },
      { type: 'feature', text: 'Added webhook support for real-time event notifications' },
      { type: 'improvement', text: 'Redesigned settings page with better organization' },
    ],
  },
  {
    version: '1.0.0',
    date: '2024-01-15',
    title: 'Initial Launch 🎉',
    description: 'Our first public release with core features and functionality.',
    changes: [
      { type: 'feature', text: 'User authentication with email and 2FA support' },
      { type: 'feature', text: 'Subscription billing with Stripe integration' },
      { type: 'feature', text: 'Admin dashboard for user management' },
      { type: 'feature', text: 'Activity logging and audit trails' },
    ],
  },
]

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

  const { icon: Icon, label, className } = config[type]

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
      {/* Version badge */}
      <div className="absolute -top-3 left-6 flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-primary shadow-sm">
        <Star className="h-3.5 w-3.5" />
        v{entry.version}
      </div>

      {/* Date */}
      <p className="mb-2 mt-2 text-sm text-muted-foreground">
        {new Date(entry.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      {/* Title & Description */}
      <h2 className="mb-2 text-xl font-bold">{entry.title}</h2>
      {entry.description && (
        <p className="mb-4 text-muted-foreground">{entry.description}</p>
      )}

      {/* Changes list */}
      <ul className="space-y-2.5">
        {entry.changes.map((change, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <ChangeTypeBadge type={change.type} />
            <span className="flex-1 pt-0.5 text-sm leading-relaxed">{change.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ChangelogPage() {
  const { user } = useAuthContext()
  const location = useLocation()

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

          {/* Changelog entries */}
          <div className="mx-auto max-w-3xl space-y-8">
            {CHANGELOG_ENTRIES.map((entry, idx) => (
              <ChangelogEntryCard key={idx} entry={entry} />
            ))}
          </div>

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
