import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Rocket, Clock, Mail, Share2, ArrowLeft, Plus, Trash2,
  Eye, EyeOff, Loader2, Check, AlertCircle,
} from 'lucide-react'
import { Header } from '../../../components/@system/Header/Header'
import { PageLayout } from '../../../components/@system/layout/PageLayout'
import { Button } from '../../../components/@system/ui/button'
import { FormField, Input } from '../../../components/@system/Form/Form'
import { Alert } from '../../../components/@system/Alert/Alert'
import { api } from '../../../lib/@system/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DropForm {
  name: string
  description: string
  heroSubtitle: string
  launchAt: string
  imageUrl: string
  productUrl: string
  ctaText: string
  themeColor: string
  features: string[]
  status: 'active' | 'draft' | 'ended'
}

const EMPTY_FORM: DropForm = {
  name: '',
  description: '',
  heroSubtitle: '',
  launchAt: '',
  imageUrl: '',
  productUrl: '',
  ctaText: 'Join the Waitlist',
  themeColor: '#6d28d9',
  features: ['', '', ''],
  status: 'active',
}

// ─── Page Preview ─────────────────────────────────────────────────────────────

function PagePreview({ form }: { form: DropForm }) {
  const color = form.themeColor || '#6d28d9'
  const launchDate = form.launchAt ? new Date(form.launchAt) : null
  const isValid = launchDate && !isNaN(launchDate.getTime())
  const features = form.features.filter(Boolean)

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
      style={{ minHeight: '560px' }}
    >
      {/* Browser chrome mockup */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
          <div className="h-3 w-3 rounded-full bg-green-400/60" />
        </div>
        <div className="flex-1 rounded-md bg-background/60 px-3 py-1 text-xs text-muted-foreground">
          {form.name ? `dropmagic.com/drop/${form.name.toLowerCase().replace(/\s+/g, '-')}` : 'dropmagic.com/drop/...'}
        </div>
      </div>

      {/* Page preview content */}
      <div
        className="p-6 text-sm"
        style={{ background: `linear-gradient(135deg, ${color}15, transparent 60%)` }}
      >
        {/* Badge */}
        <div className="mb-4 flex justify-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: `${color}20`, color }}
          >
            <Rocket className="h-3 w-3" />
            Limited Launch
          </span>
        </div>

        {/* Hero */}
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold leading-tight">
            {form.name || <span className="text-muted-foreground">Your Product Name</span>}
          </h2>
          {(form.description || form.heroSubtitle) && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {form.heroSubtitle || form.description}
            </p>
          )}
        </div>

        {/* Image */}
        {form.imageUrl ? (
          <div className="mb-4 overflow-hidden rounded-xl border border-border">
            <img src={form.imageUrl} alt={form.name} className="h-32 w-full object-cover" />
          </div>
        ) : (
          <div
            className="mb-4 flex h-24 items-center justify-center rounded-xl border border-dashed border-border"
            style={{ background: `${color}08` }}
          >
            <Rocket className="h-8 w-8 opacity-20" style={{ color }} />
          </div>
        )}

        {/* Countdown */}
        {isValid && (
          <div className="mb-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              Launching in:
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['DD', 'HH', 'MM', 'SS'].map((unit) => (
                <div
                  key={unit}
                  className="flex flex-col items-center rounded-xl border border-border bg-card p-2"
                >
                  <span className="font-bold tabular-nums text-sm">00</span>
                  <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA form */}
        <div className="mb-4 rounded-xl border border-border bg-card p-3">
          <div className="mb-2 h-6 rounded-md bg-muted/50" />
          <button
            className="w-full rounded-md py-2 text-xs font-semibold text-white"
            style={{ background: color }}
          >
            <Mail className="mr-1.5 inline h-3 w-3" />
            {form.ctaText || 'Join the Waitlist'}
          </button>
        </div>

        {/* Features */}
        {features.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              What you'll get
            </p>
            <ul className="space-y-1">
              {features.slice(0, 4).map((f, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <Check className="mt-0.5 h-3 w-3 shrink-0" style={{ color }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function LaunchPageBuilderPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEditing = Boolean(id)

  const [form, setForm] = useState<DropForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [announcing, setAnnouncing] = useState(false)
  const [announceResult, setAnnounceResult] = useState<{ sent: number; total: number } | null>(null)

  // Load existing drop for editing
  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        setLoading(true)
        const { drop } = await api.get<{ drop: any }>(`/drops/${id}`)
        setForm({
          name: drop.name || '',
          description: drop.description || '',
          heroSubtitle: drop.hero_subtitle || '',
          launchAt: drop.launch_at ? drop.launch_at.slice(0, 16) : '',
          imageUrl: drop.image_url || '',
          productUrl: drop.product_url || '',
          ctaText: drop.cta_text || 'Join the Waitlist',
          themeColor: drop.theme_color || '#6d28d9',
          features: drop.features?.length ? drop.features : ['', '', ''],
          status: drop.status || 'active',
        })
      } catch {
        setError('Failed to load drop')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const set = useCallback(<K extends keyof DropForm>(key: K, value: DropForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const setFeature = (index: number, value: string) => {
    setForm((prev) => {
      const features = [...prev.features]
      features[index] = value
      return { ...prev, features }
    })
  }

  const addFeature = () => setForm((prev) => ({ ...prev, features: [...prev.features, ''] }))
  const removeFeature = (index: number) => setForm((prev) => ({
    ...prev,
    features: prev.features.filter((_, i) => i !== index),
  }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Product name is required')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        hero_subtitle: form.heroSubtitle.trim() || null,
        launch_at: form.launchAt ? new Date(form.launchAt).toISOString() : null,
        image_url: form.imageUrl.trim() || null,
        product_url: form.productUrl.trim() || null,
        cta_text: form.ctaText.trim() || 'Join the Waitlist',
        theme_color: form.themeColor,
        features: form.features.filter(Boolean),
        status: form.status,
      }

      if (isEditing) {
        await api.patch(`/drops/${id}`, payload)
      } else {
        const { drop } = await api.post<{ drop: any }>('/drops', payload)
        navigate(`/app/drops/${drop.id}`, { replace: true })
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Failed to save drop. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleAnnounce = async () => {
    if (!id) return
    if (!confirm('Send launch announcement email to all waitlist subscribers?')) return

    try {
      setAnnouncing(true)
      const result = await api.post<{ sent: number; total: number; message?: string }>(`/drops/${id}/announce`, {})
      setAnnounceResult({ sent: result.sent, total: result.total ?? result.sent })
    } catch {
      setError('Failed to send announcement emails')
    } finally {
      setAnnouncing(false)
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
        {/* ── Page Header ───────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/app')} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold">
                <Rocket className="h-5 w-5 text-primary" />
                {isEditing ? 'Edit Launch Page' : 'Create Launch Page'}
              </h1>
              <p className="text-xs text-muted-foreground">
                Build your product launch page and collect signups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/drop/${id}`, '_blank')}
                  className="gap-1.5"
                >
                  <Eye className="h-4 w-4" />
                  View Live
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnnounce}
                  disabled={announcing}
                  className="gap-1.5"
                >
                  {announcing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Announce
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview((p) => !p)}
              className="gap-1.5 lg:hidden"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'Hide' : 'Preview'}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isEditing ? 'Save Changes' : 'Create Drop'}
            </Button>
          </div>
        </div>

        {/* ── Alerts ────────────────────────────────────────────────── */}
        {error && (
          <Alert variant="destructive" className="mb-4" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-4">
            {isEditing ? 'Changes saved!' : 'Launch page created!'}
          </Alert>
        )}
        {announceResult && (
          <Alert variant="success" className="mb-4">
            Sent {announceResult.sent} launch announcement emails to your waitlist!
          </Alert>
        )}

        {/* ── Two-panel layout ──────────────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

          {/* ── Builder Form ──────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Basic info */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Basic Info
              </h2>
              <div className="space-y-4">
                <FormField label="Product Name" required>
                  <Input
                    placeholder="Air Flux Gen 2"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </FormField>
                <FormField label="Short Description">
                  <Input
                    placeholder="One-line description shown below the title"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </FormField>
                <FormField label="Hero Subtitle">
                  <Input
                    placeholder="More detail shown on the launch page"
                    value={form.heroSubtitle}
                    onChange={(e) => set('heroSubtitle', e.target.value)}
                  />
                </FormField>
                <FormField label="Launch Date">
                  <Input
                    type="datetime-local"
                    value={form.launchAt}
                    onChange={(e) => set('launchAt', e.target.value)}
                  />
                </FormField>
                <FormField label="Product URL (after launch)">
                  <Input
                    type="url"
                    placeholder="https://yourproduct.com"
                    value={form.productUrl}
                    onChange={(e) => set('productUrl', e.target.value)}
                  />
                </FormField>
              </div>
            </section>

            {/* Visual customisation */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Visual
              </h2>
              <div className="space-y-4">
                <FormField label="Hero Image URL">
                  <Input
                    type="url"
                    placeholder="https://example.com/product-image.jpg"
                    value={form.imageUrl}
                    onChange={(e) => set('imageUrl', e.target.value)}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Theme Color">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.themeColor}
                        onChange={(e) => set('themeColor', e.target.value)}
                        className="h-9 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1"
                      />
                      <Input
                        value={form.themeColor}
                        onChange={(e) => set('themeColor', e.target.value)}
                        className="font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </FormField>
                  <FormField label="CTA Button Text">
                    <Input
                      placeholder="Join the Waitlist"
                      value={form.ctaText}
                      onChange={(e) => set('ctaText', e.target.value)}
                    />
                  </FormField>
                </div>
                <FormField label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => set('status', e.target.value as DropForm['status'])}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="active">Active — accepting signups</option>
                    <option value="draft">Draft — not visible yet</option>
                    <option value="ended">Ended — launch is complete</option>
                  </select>
                </FormField>
              </div>
            </section>

            {/* Feature bullets */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Feature Bullets
                </h2>
                <Button variant="outline" size="sm" onClick={addFeature} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {form.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder={`Feature ${i + 1}`}
                      value={f}
                      onChange={(e) => setFeature(i, e.target.value)}
                      className="flex-1"
                    />
                    {form.features.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(i)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Shown as checkmark bullets on your launch page
              </p>
            </section>

            {/* Share info */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Share2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Referral sharing is automatic</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    After signup, visitors get a unique referral link they can share on Twitter,
                    Facebook, LinkedIn, or via email. Each referral moves them up the waitlist.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* ── Live Preview ─────────────────────────────────────── */}
          <div className={`${showPreview ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-6">
              <div className="mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Live Preview</span>
              </div>
              <PagePreview form={form} />
              {isEditing && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Preview updates as you type. Save to publish changes.
                </div>
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  )
}
