// Example usage of the Privacy Policy Generator API

const exampleRequest = {
  productName: 'DropMagic',
  companyName: 'DropMagic Inc.',
  website: 'https://dropmagic.com',
  contactEmail: 'privacy@dropmagic.com',
  dataTypes: [
    {
      name: 'Email Address',
      description: 'Your email address used for account registration and login',
      purpose: 'Account creation, authentication, password resets, and service notifications',
      retention: 'Until account deletion or 2 years after last login'
    },
    {
      name: 'Profile Information',
      description: 'Your name, avatar, and bio information',
      purpose: 'Personalization and display on your public profile',
      retention: 'Until account deletion'
    },
    {
      name: 'Usage Data',
      description: 'Information about how you interact with our Service, including pages viewed, features used, and time spent',
      purpose: 'Service analytics, performance monitoring, and feature improvement',
      retention: '90 days for raw logs, aggregated data retained indefinitely'
    },
    {
      name: 'Device Information',
      description: 'Browser type, IP address, device identifiers, and operating system',
      purpose: 'Security, fraud prevention, and technical support',
      retention: '30 days'
    },
    {
      name: 'Payment Information',
      description: 'Payment card details (processed by our payment provider)',
      purpose: 'Transaction processing and billing',
      retention: 'We do not store full payment card details. Our payment processor retains data according to their policies.'
    }
  ],
  thirdParties: [
    {
      name: 'Stripe',
      purpose: 'Payment processing and subscription management',
      website: 'https://stripe.com',
      privacyPolicy: 'https://stripe.com/privacy'
    },
    {
      name: 'Polar',
      purpose: 'Subscription management and billing',
      website: 'https://polar.sh',
      privacyPolicy: 'https://polar.sh/legal/privacy'
    },
    {
      name: 'Vercel',
      purpose: 'Web hosting and content delivery',
      website: 'https://vercel.com',
      privacyPolicy: 'https://vercel.com/legal/privacy-policy'
    },
    {
      name: 'Supabase / PostgreSQL',
      purpose: 'Database hosting and data storage',
      website: 'https://supabase.com',
      privacyPolicy: 'https://supabase.com/privacy'
    },
    {
      name: 'Google Analytics',
      purpose: 'Website analytics and usage tracking',
      website: 'https://analytics.google.com',
      privacyPolicy: 'https://policies.google.com/privacy'
    },
    {
      name: 'Resend',
      purpose: 'Transactional email delivery',
      website: 'https://resend.com',
      privacyPolicy: 'https://resend.com/legal/privacy-policy'
    }
  ],
  effectiveDate: '2024-03-01'
}

// Example fetch request (client-side)
async function generatePrivacyPolicy() {
  try {
    const response = await fetch('/api/privacy-policy/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-CSRF-Token': await getCSRFToken() // Fetch CSRF token first
      },
      body: JSON.stringify(exampleRequest)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Generated Privacy Policy:')
    console.log(data.privacyPolicy)
    console.log('\nMetadata:', data.metadata)

    return data
  } catch (error) {
    console.error('Failed to generate privacy policy:', error)
    throw error
  }
}

// Helper to get CSRF token
async function getCSRFToken() {
  const response = await fetch('/api/csrf-token')
  const data = await response.json()
  return data.csrfToken
}

// Example Node.js usage (server-side testing)
async function testPrivacyPolicyGeneration() {
  const fetch = require('node-fetch')
  const BASE_URL = process.env.API_URL || 'http://localhost:3000'
  
  // First, get auth token (assuming you have a test user)
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'test-password'
    })
  })
  
  const { token } = await loginResponse.json()

  // Get CSRF token
  const csrfResponse = await fetch(`${BASE_URL}/api/csrf-token`, {
    headers: { Cookie: loginResponse.headers.get('set-cookie') }
  })
  const { csrfToken } = await csrfResponse.json()

  // Generate privacy policy
  const response = await fetch(`${BASE_URL}/api/privacy-policy/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-CSRF-Token': csrfToken,
      Cookie: loginResponse.headers.get('set-cookie')
    },
    body: JSON.stringify(exampleRequest)
  })

  const result = await response.json()
  
  console.log('Privacy Policy Generated Successfully!')
  console.log('='.repeat(80))
  console.log(result.privacyPolicy)
  console.log('='.repeat(80))
  
  return result
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    exampleRequest,
    generatePrivacyPolicy,
    testPrivacyPolicyGeneration
  }
}
