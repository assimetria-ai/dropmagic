import { useState, useEffect } from 'react'
import {
  Rocket,
  Clock,
  Mail,
  Share2,
  Plus,
  TrendingUp,
  Users,
  Target,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { Button } from '../../../components/@system/ui/button'
import { api } from '../../../lib/@system/api'

// ─── Types ───────────────────────────────────────────────────────────────────

type DropStatus = 'active' | 'ended' | 'draft'

interface Drop {
  id: number
  name: string
  countdown: string
  signups: number
  shares: number
  status: DropStatus
}

interface Signup {
  id: number
  email: string
  dropName: string
  referralSource: string
  dateJoined: string
  referralCount: number
}

interface DashboardStats {
  activeDrops: number
  totalSignups: number
  sharesGenerated: number
  conversionRate: string
}

// ─── Mock Data (until API is wired) ──────────────────────────────────────────

const MOCK_STATS: DashboardStats = {
  activeDrops: 3,
  totalSignups: 1_842,
  sharesGenerated: 4_210,
  conversionRate: '38.2%',
}

const MOCK_DROPS: Drop[] = [
  { id: 1, name: 'Air Flux Gen 2', countdown: '2d 14h 32m', signups: 843, shares: 1_920, status: 'active' },
  { id: 2, name: 'Studio Hoodie Black', countdown: '5d 03h 11m', signups: 412, shares: 887, status: 'active' },
  { id: 3, name: 'Limited Vinyl Box', countdown: '0d 00h 00m', signups: 319, shares: 701, status: 'ended' },
  { id: 4, name: 'Summer Capsule', countdown: '—', signups: 0, shares: 0, status: 'draft' },
]

const MOCK_SIGNUPS: Signup[] = [
  { id: 1, email: 'jaden.k@gmail.com', dropName: 'Air Flux Gen 2', referralSource: 'Twitter', dateJoined: '2026-02-25', referralCount: 7 },
  { id: 2, email: 'sofia.m@icloud.com', dropName: 'Studio Hoodie Black', referralSource: 'Instagram', dateJoined: '2026-02-25', referralCount: 3 },
  { id: 3, email: 'marcus.t@proton.me', dropName: 'Air Flux Gen 2', referralSource: 'Direct', dateJoined: '2026-02-24', referralCount: 12 },
  { id: 4, email: 'priya.n@outlook.com', dropName: 'Limited Vinyl Box', referralSource: 'TikTok', dateJoined: '2026-02-24', referralCount: 1 },
  { id: 5, email: 'luca.v@gmail.com', dropName: 'Studio Hoodie Black', referralSource: 'Referral Link', dateJoined: '2026-02-23', referralCount: 5 },
  { id: 6, email: 'emma.d@hey.com', dropName: 'Air Flux Gen 2', referralSource: 'Twitter', dateJoined: '2026-02-23', referralCount: 2 },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  bg: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={`rounded-xl ${bg} p-3`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: DropStatus }) {
  const map: Record<DropStatus, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-500/15 text-green-600' },
    ended: { label: 'Ended', className: 'bg-muted text-muted-foreground' },
    draft: { label: 'Draft', className: 'bg-yellow-500/15 text-yellow-600' },
  }
  const { label, className } = map[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function DropCard({ drop }: { drop: Drop }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Product image placeholder */}
      <div className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/10 to-purple-500/10">
        <Rocket className="h-10 w-10 text-primary/40" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{drop.name}</h3>
          <StatusBadge status={drop.status} />
        </div>

        {drop.status !== 'draft' && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="font-mono font-medium text-foreground">{drop.countdown}</span>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            {drop.signups.toLocaleString()} signups
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="h-3.5 w-3.5" />
            {drop.shares.toLocaleString()} shares
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DropMagicDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [drops, setDrops] = useState<Drop[]>([])
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // Attempt real API calls — fall back to mock data gracefully
        const [statsRes, dropsRes, signupsRes] = await Promise.allSettled([
          api.get('/drops/stats'),
          api.get('/drops'),
          api.get('/drops/signups/recent'),
        ])

        setStats(
          statsRes.status === 'fulfilled' ? (statsRes.value.data as DashboardStats) : MOCK_STATS
        )
        setDrops(
          dropsRes.status === 'fulfilled' ? (dropsRes.value.data as Drop[]) : MOCK_DROPS
        )
        setSignups(
          signupsRes.status === 'fulfilled' ? (signupsRes.value.data as Signup[]) : MOCK_SIGNUPS
        )
      } catch {
        setStats(MOCK_STATS)
        setDrops(MOCK_DROPS)
        setSignups(MOCK_SIGNUPS)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const displayStats = stats ?? MOCK_STATS

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageLayout>
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Rocket className="h-6 w-6 text-primary" />
              DropMagic
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your drops, track signups, and watch the hype grow.
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Drop
          </Button>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Rocket}
              label="Active Drops"
              value={displayStats.activeDrops}
              color="text-primary"
              bg="bg-primary/10"
            />
            <StatCard
              icon={Users}
              label="Total Signups"
              value={displayStats.totalSignups.toLocaleString()}
              color="text-blue-500"
              bg="bg-blue-500/10"
            />
            <StatCard
              icon={Share2}
              label="Shares Generated"
              value={displayStats.sharesGenerated.toLocaleString()}
              color="text-purple-500"
              bg="bg-purple-500/10"
            />
            <StatCard
              icon={Target}
              label="Conversion Rate"
              value={displayStats.conversionRate}
              color="text-green-500"
              bg="bg-green-500/10"
            />
          </div>
        )}

        {/* ── Active Drops ────────────────────────────────────────────── */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Drops</h2>
            <span className="text-sm text-muted-foreground">{drops.length} total</span>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {drops.map((drop) => (
                <DropCard key={drop.id} drop={drop} />
              ))}
            </div>
          )}
        </div>

        {/* ── Recent Signups ───────────────────────────────────────────── */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Signups</h2>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Last 48 hours
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Drop</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Date Joined</th>
                    <th className="px-4 py-3 text-right">Referrals</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="h-4 animate-pulse rounded bg-muted" />
                          </td>
                        </tr>
                      ))
                    : signups.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 font-medium">{s.email}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.dropName}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                              {s.referralSource}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{s.dateJoined}</td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`font-semibold ${
                                s.referralCount >= 5
                                  ? 'text-green-600'
                                  : s.referralCount >= 2
                                  ? 'text-primary'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {s.referralCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  )
}
