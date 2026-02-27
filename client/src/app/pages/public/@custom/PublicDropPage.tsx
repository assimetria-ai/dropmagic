import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Rocket,
  Clock,
  Mail,
  Share2,
  Copy,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Button } from '../../../components/@system/ui/button'
import { FormField, Input } from '../../../components/@system/Form/Form'
import { Alert } from '../../../components/@system/Alert/Alert'
import { Card, CardContent } from '../../../components/@system/Card/Card'
import { api } from '../../../lib/@system/api'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Drop {
  id: number
  slug: string
  name: string
  description: string
  imageUrl: string | null
  launchDate: string
  status: 'active' | 'ended' | 'draft'
  totalSignups: number
}

interface SignupResponse {
  success: boolean
  position: number
  referralCode: string
  message?: string
}

// ─── Countdown Timer ─────────────────────────────────────────────────────────

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    expired: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false })

  useEffect(() => {
    const target = new Date(targetDate).getTime()

    const updateCountdown = () => {
      const now = Date.now()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, expired: false })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CountdownDisplay({ targetDate }: { targetDate: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(targetDate)

  if (expired) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-lg font-semibold text-muted-foreground">Launch has ended</p>
      </div>
    )
  }

  const units = [
    { label: 'Days', value: days },
    { label: 'Hours', value: hours },
    { label: 'Minutes', value: minutes },
    { label: 'Seconds', value: seconds },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="flex flex-col items-center rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <span className="text-3xl font-bold tabular-nums tracking-tight">
            {unit.value.toString().padStart(2, '0')}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function ShareButtons({
  slug,
  referralCode,
  dropName,
}: {
  slug: string
  referralCode: string
  dropName: string
}) {
  const shareUrl = `${window.location.origin}/drop/${slug}?ref=${referralCode}`
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareText = `Check out ${dropName} - I'm on the waitlist!`

  const shareLinks = [
    {
      name: 'Twitter',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      name: 'Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: 'bg-blue-700 hover:bg-blue-800',
    },
    {
      name: 'LinkedIn',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      name: 'Email',
      url: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`,
      color: 'bg-gray-700 hover:bg-gray-800',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${link.color}`}
          >
            <Share2 className="h-4 w-4" />
            {link.name}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={shareUrl}
          readOnly
          className="flex-1 font-mono text-xs"
        />
        <Button
          onClick={copyToClipboard}
          variant="outline"
          className="gap-2"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PublicDropPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()

  const [drop, setDrop] = useState<Drop | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState<SignupResponse | null>(null)

  const referralCode = searchParams.get('ref') || ''

  // Load drop data
  useEffect(() => {
    if (!slug) return

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get<{ drop: Drop }>(`/drops/${slug}`)
        setDrop(response.drop)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load drop')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [slug])

  // Handle signup submission
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !slug) return

    try {
      setSubmitting(true)
      setError(null)

      const response = await api.post<SignupResponse>(`/drops/${slug}/signup`, {
        email,
        referralCode: referralCode || undefined,
      })

      if (response.success) {
        setSignupSuccess(response)
      } else {
        setError(response.message || 'Signup failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-purple-500/5 to-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading drop...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !drop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-purple-500/5 to-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive" title="Error">
              {error}
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!drop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-purple-500/5 to-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="warning" title="Not Found">
              This drop doesn't exist or has been removed.
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state (after signup)
  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-purple-500/5 to-background py-12 px-4">
        <div className="mx-auto max-w-2xl">
          <Card className="overflow-hidden border-2 border-primary shadow-lg">
            <CardContent className="p-8">
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-green-500/10 p-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">You're on the list!</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                  Position <span className="font-bold text-primary">#{signupSuccess.position}</span>
                </p>
              </div>

              <Alert variant="success" title="Move up the list!" className="mb-6">
                Share your unique link with friends to climb the waitlist and get early access.
              </Alert>

              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Your Referral Link
                  </h3>
                  <ShareButtons
                    slug={drop.slug}
                    referralCode={signupSuccess.referralCode}
                    dropName={drop.name}
                  />
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Every friend who signs up using your link moves you up in the queue!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Main signup page
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-purple-500/5 to-background py-12 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Rocket className="h-4 w-4" />
            Limited Launch
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{drop.name}</h1>
          {drop.description && (
            <p className="mt-4 text-lg text-muted-foreground">{drop.description}</p>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Product Image */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {drop.imageUrl ? (
                <img
                  src={drop.imageUrl}
                  alt={drop.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-96 items-center justify-center bg-gradient-to-br from-primary/10 to-purple-500/10">
                  <Rocket className="h-24 w-24 text-primary/30" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signup Form */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Launching in:
                </div>
                <CountdownDisplay targetDate={drop.launchDate} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Join the Waitlist</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  Be the first to know when we launch. Get exclusive early access and special perks.
                </p>

                {error && (
                  <Alert variant="destructive" className="mb-4" dismissible>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <FormField label="Email Address" required>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={submitting}
                      className="text-base"
                    />
                  </FormField>

                  {referralCode && (
                    <Alert variant="info" className="text-xs">
                      You were referred by a friend! You'll both get priority access.
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting || !email}
                    className="w-full gap-2 text-base"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Join the Waitlist
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{drop.totalSignups.toLocaleString()} people already joined</span>
                  <span className="flex items-center gap-1">
                    <Share2 className="h-3 w-3" />
                    Get a referral link after signup
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
