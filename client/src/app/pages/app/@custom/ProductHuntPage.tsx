import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ExternalLink, Rocket, Send, AlertCircle,
  Loader2, CheckCircle2,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { Button } from '../../../components/@system/ui/button'
import { FormField, Input } from '../../../components/@system/Form/Form'
import { Alert } from '../../../components/@system/Alert/Alert'
import { api } from '../../../lib/@system/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Drop {
  id: number
  name: string
  slug: string
  description: string
  status: string
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProductHuntPage() {
  const navigate = useNavigate()

  const [drops, setDrops] = useState<Drop[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDropId, setSelectedDropId] = useState<number | null>(null)

  // PH post fields
  const [tagline, setTagline] = useState('')
  const [topics, setTopics] = useState('Developer Tools,Productivity,SaaS')
  const [token, setToken] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ url: string; name: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { drops: data } = await api.get<{ drops: Drop[] }>('/drops')
        setDrops(data.filter((d) => d.status !== 'ended'))
        if (data.length > 0) setSelectedDropId(data[0].id)
      } catch {
        setError('Failed to load drops')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const selectedDrop = drops.find((d) => d.id === selectedDropId)

  const handlePost = async () => {
    if (!selectedDropId || !tagline.trim()) {
      setError('Select a drop and add a tagline first')
      return
    }
    if (!token.trim()) {
      setError('Product Hunt Developer Token is required')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const res = await api.post<{ url: string; name: string; message?: string }>(
        `/drops/${selectedDropId}/product-hunt`,
        {
          tagline: tagline.trim(),
          topics: topics.split(',').map((t) => t.trim()).filter(Boolean),
          token: token.trim(),
          thumbnailUrl: thumbnailUrl.trim() || undefined,
        }
      )

      setResult({ url: res.url, name: res.name })
    } catch (err: any) {
      setError(err?.message || 'Failed to post to Product Hunt')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PageLayout>
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageLayout>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageLayout>
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Rocket className="h-5 w-5 text-[#DA552F]" />
              Product Hunt Integration
            </h1>
            <p className="text-xs text-muted-foreground">
              Post your product launch directly to Product Hunt
            </p>
          </div>
        </div>

        {result ? (
          /* ── Success state ───────────────────────────────────── */
          <div className="mx-auto max-w-lg">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-900 dark:bg-green-950/20">
              <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
              <h2 className="mb-2 text-xl font-bold">Posted to Product Hunt!</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                <strong>{result.name}</strong> is now live on Product Hunt.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild>
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    View on Product Hunt
                  </a>
                </Button>
                <Button variant="outline" onClick={() => navigate('/app')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* ── Form ─────────────────────────────────────────────── */}
            <div className="space-y-6">
              {error && (
                <Alert variant="destructive" dismissible onDismiss={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {drops.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                  <Rocket className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="font-medium">No active drops yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create a launch page first, then post it to Product Hunt.
                  </p>
                  <Button className="mt-4" onClick={() => navigate('/app/drops/new')}>
                    Create Launch Page
                  </Button>
                </div>
              ) : (
                <>
                  {/* Drop selector */}
                  <section className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Select Drop
                    </h2>
                    <div className="space-y-2">
                      {drops.map((drop) => (
                        <button
                          key={drop.id}
                          onClick={() => setSelectedDropId(drop.id)}
                          className={`w-full rounded-xl border p-4 text-left transition-colors ${
                            selectedDropId === drop.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{drop.name}</p>
                              {drop.description && (
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                  {drop.description}
                                </p>
                              )}
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                drop.status === 'active'
                                  ? 'bg-green-500/15 text-green-600'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {drop.status}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Post details */}
                  <section className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Post Details
                    </h2>
                    <div className="space-y-4">
                      <FormField label="Tagline" required>
                        <Input
                          placeholder="The fastest way to launch your product"
                          value={tagline}
                          onChange={(e) => setTagline(e.target.value)}
                          maxLength={60}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {tagline.length}/60 characters — make it punchy!
                        </p>
                      </FormField>
                      <FormField label="Topics (comma-separated)">
                        <Input
                          placeholder="Developer Tools, SaaS, Productivity"
                          value={topics}
                          onChange={(e) => setTopics(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Thumbnail URL (optional)">
                        <Input
                          type="url"
                          placeholder="https://example.com/thumbnail.png"
                          value={thumbnailUrl}
                          onChange={(e) => setThumbnailUrl(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          240×240px image. Uses your drop's image if not set.
                        </p>
                      </FormField>
                    </div>
                  </section>

                  {/* Auth */}
                  <section className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Product Hunt API Token
                    </h2>
                    <FormField label="Developer Token" required>
                      <Input
                        type="password"
                        placeholder="ph_api_token_..."
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                      />
                    </FormField>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Get your token at{' '}
                      <a
                        href="https://www.producthunt.com/v2/oauth/applications"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        producthunt.com/v2/oauth/applications
                      </a>
                      . Your token is used only for this request and never stored.
                    </p>
                  </section>

                  <Button
                    onClick={handlePost}
                    disabled={submitting || !selectedDropId || !tagline.trim() || !token.trim()}
                    size="lg"
                    className="w-full gap-2 bg-[#DA552F] hover:bg-[#c44828] text-white"
                  >
                    {submitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                    {submitting ? 'Posting…' : 'Post to Product Hunt'}
                  </Button>
                </>
              )}
            </div>

            {/* ── Tips sidebar ─────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-semibold">Tips for a great launch</h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {[
                    'Launch on a Tuesday or Wednesday for peak traffic',
                    'Post between 12:01–1:00 AM PST (day starts in SF)',
                    'Prepare your community to upvote on launch day',
                    'Have a compelling tagline under 60 characters',
                    'Use a high-quality 240×240 product thumbnail',
                    'Respond to every comment within the first 24h',
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-xs font-medium">API Note</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Product Hunt's API requires a Developer Token with{' '}
                      <code className="rounded bg-muted px-1">post:create</code> scope.
                      Products go into a review queue before going live.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageLayout>
    </div>
  )
}
