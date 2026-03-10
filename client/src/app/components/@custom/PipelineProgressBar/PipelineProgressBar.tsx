import { Check } from 'lucide-react'

// ─── Pipeline Stages ─────────────────────────────────────────────────────────

export interface PipelineStage {
  key: string
  label: string
  complete: boolean
}

export interface PipelineProgressBarProps {
  stages: PipelineStage[]
  /** Optional className for the outer wrapper */
  className?: string
}

/**
 * Visual progress indicator showing how far a product/drop is through its
 * pipeline stages.  Renders a segmented bar with labelled dots.
 */
export function PipelineProgressBar({ stages, className = '' }: PipelineProgressBarProps) {
  const completedCount = stages.filter((s) => s.complete).length
  const totalStages = stages.length
  const pct = totalStages > 1 ? ((completedCount - 1) / (totalStages - 1)) * 100 : 0
  const clampedPct = Math.max(0, Math.min(pct, 100))

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Progress bar track */}
      <div className="relative flex items-center">
        {/* Background track */}
        <div className="absolute left-0 right-0 h-1 rounded-full bg-muted" />
        {/* Filled track */}
        <div
          className="absolute left-0 h-1 rounded-full bg-primary transition-all duration-500"
          style={{ width: `${clampedPct}%` }}
        />

        {/* Stage dots */}
        <div className="relative flex w-full justify-between">
          {stages.map((stage, i) => {
            const isComplete = stage.complete
            const isActive = !isComplete && i === completedCount
            return (
              <div
                key={stage.key}
                className="flex flex-col items-center"
                title={stage.label}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                    isComplete
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isActive
                      ? 'border-primary bg-background'
                      : 'border-muted bg-background'
                  }`}
                >
                  {isComplete && <Check className="h-3 w-3" />}
                  {isActive && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Labels row */}
      <div className="flex w-full justify-between">
        {stages.map((stage) => (
          <span
            key={stage.key}
            className={`text-[10px] leading-tight ${
              stage.complete ? 'font-medium text-foreground' : 'text-muted-foreground'
            }`}
          >
            {stage.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Drop-specific helpers ───────────────────────────────────────────────────

interface DropForPipeline {
  status: 'active' | 'ended' | 'draft'
  description?: string | null
  image_url?: string | null
  imageUrl?: string | null
  launch_at?: string | null
  launchAt?: string | null
  announced_at?: string | null
  announcedAt?: string | null
  signups?: number
}

/**
 * Compute pipeline stages for a DropMagic drop.
 *
 * Stages:
 *  1. Created     — always complete (drop exists)
 *  2. Configured  — has description + image + launch date
 *  3. Live        — status is 'active' (collecting signups)
 *  4. Announced   — launch announcement sent
 *  5. Complete    — status is 'ended'
 */
export function getDropPipelineStages(drop: DropForPipeline): PipelineStage[] {
  const hasDescription = Boolean(drop.description)
  const hasImage = Boolean(drop.image_url || drop.imageUrl)
  const hasLaunchDate = Boolean(drop.launch_at || drop.launchAt)
  const isConfigured = hasDescription && hasImage && hasLaunchDate
  const isLive = drop.status === 'active' || drop.status === 'ended'
  const isAnnounced = Boolean(drop.announced_at || drop.announcedAt)
  const isEnded = drop.status === 'ended'

  return [
    { key: 'created', label: 'Created', complete: true },
    { key: 'configured', label: 'Configured', complete: isConfigured },
    { key: 'live', label: 'Live', complete: isLive },
    { key: 'announced', label: 'Announced', complete: isAnnounced },
    { key: 'complete', label: 'Complete', complete: isEnded },
  ]
}
