// @custom — Privacy Policy Generator API
// POST /api/privacy-policy/generate — generate privacy policy from product metadata
const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const { validate } = require('../../../lib/@system/Validation')
const logger = require('../../../lib/@system/Logger')
const { z } = require('zod')

// ── Validation ────────────────────────────────────────────────────────────

const DataTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  purpose: z.string().min(1),
  retention: z.string().optional()
})

const ThirdPartySchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  website: z.string().url().optional(),
  privacyPolicy: z.string().url().optional()
})

const GeneratePrivacyPolicyBody = z.object({
  productName: z.string().min(1),
  companyName: z.string().min(1),
  website: z.string().url(),
  contactEmail: z.string().email(),
  dataTypes: z.array(DataTypeSchema).min(1),
  thirdParties: z.array(ThirdPartySchema).optional(),
  effectiveDate: z.string().optional() // ISO date string
})

// ── Privacy Policy Template ───────────────────────────────────────────────

function generatePrivacyPolicy(metadata) {
  const {
    productName,
    companyName,
    website,
    contactEmail,
    dataTypes,
    thirdParties = [],
    effectiveDate
  } = metadata

  const date = effectiveDate ? new Date(effectiveDate).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  // Generate data types section
  const dataTypesSection = dataTypes.map((dt, idx) => {
    return `${idx + 1}. **${dt.name}**: ${dt.description}\n   - Purpose: ${dt.purpose}${dt.retention ? `\n   - Retention: ${dt.retention}` : ''}`
  }).join('\n\n')

  // Generate third parties section
  const thirdPartiesSection = thirdParties.length > 0 
    ? thirdParties.map((tp, idx) => {
        let section = `${idx + 1}. **${tp.name}**: ${tp.purpose}`
        if (tp.website) section += `\n   - Website: ${tp.website}`
        if (tp.privacyPolicy) section += `\n   - Privacy Policy: ${tp.privacyPolicy}`
        return section
      }).join('\n\n')
    : 'We do not share your personal information with third-party service providers.'

  return `# Privacy Policy for ${productName}

**Effective Date:** ${date}

## Introduction

Welcome to ${productName} (the "Service"). This Privacy Policy explains how ${companyName} ("we," "us," or "our") collects, uses, and protects your personal information when you use our Service.

By using ${productName}, you agree to the collection and use of information in accordance with this policy.

## Information We Collect

We collect the following types of information to provide and improve our Service:

${dataTypesSection}

## How We Use Your Information

We use the information we collect to:

- Provide, maintain, and improve the Service
- Process transactions and send related information
- Send technical notices, updates, security alerts, and support messages
- Respond to your comments, questions, and provide customer service
- Monitor and analyze trends, usage, and activities in connection with the Service
- Detect, prevent, and address technical issues and fraudulent activity

## Data Security

We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.

## Third-Party Services

${thirdPartiesSection}

## Data Retention

We retain your personal information for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.

## Your Rights

Depending on your location, you may have the following rights regarding your personal information:

- **Access**: Request a copy of your personal information
- **Correction**: Request correction of inaccurate information
- **Deletion**: Request deletion of your personal information
- **Data Portability**: Request transfer of your data to another service
- **Objection**: Object to processing of your personal information

To exercise these rights, please contact us at ${contactEmail}.

## Children's Privacy

Our Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top.

We encourage you to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.

## International Data Transfers

Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ from those in your jurisdiction.

## Contact Us

If you have any questions about this Privacy Policy, please contact us:

- **Email**: ${contactEmail}
- **Website**: ${website}

---

*This privacy policy was generated on ${date} for ${productName} by ${companyName}.*`
}

// ── Routes ────────────────────────────────────────────────────────────────

// POST /api/privacy-policy/generate — generate privacy policy from metadata
router.post(
  '/privacy-policy/generate',
  authenticate,
  validate({ body: GeneratePrivacyPolicyBody }),
  async (req, res, next) => {
    try {
      const metadata = req.body
      const privacyPolicy = generatePrivacyPolicy(metadata)

      logger.info({ userId: req.user.id, productName: metadata.productName }, 'privacy policy generated')

      res.json({
        privacyPolicy,
        metadata: {
          productName: metadata.productName,
          companyName: metadata.companyName,
          effectiveDate: metadata.effectiveDate || new Date().toISOString(),
          generatedAt: new Date().toISOString()
        }
      })
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router
