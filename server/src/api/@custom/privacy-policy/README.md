# Privacy Policy Generator API

Auto-generates privacy policies from product metadata using a comprehensive template.

## Endpoint

```
POST /api/privacy-policy/generate
```

**Authentication:** Required (Bearer token)

## Request Body

```json
{
  "productName": "MyApp",
  "companyName": "MyCompany Inc.",
  "website": "https://myapp.com",
  "contactEmail": "privacy@myapp.com",
  "dataTypes": [
    {
      "name": "Email Address",
      "description": "User's email address for account authentication",
      "purpose": "Account creation, authentication, and communication",
      "retention": "Until account deletion or 2 years after last login"
    },
    {
      "name": "Usage Data",
      "description": "Information about how you use the Service",
      "purpose": "Analytics and service improvement"
    }
  ],
  "thirdParties": [
    {
      "name": "Stripe",
      "purpose": "Payment processing",
      "website": "https://stripe.com",
      "privacyPolicy": "https://stripe.com/privacy"
    },
    {
      "name": "Google Analytics",
      "purpose": "Usage analytics and service optimization",
      "website": "https://analytics.google.com",
      "privacyPolicy": "https://policies.google.com/privacy"
    }
  ],
  "effectiveDate": "2024-03-01"
}
```

## Fields

### Required

- **productName** (string): Name of the product/service
- **companyName** (string): Legal entity operating the service  
- **website** (string, URL): Product website
- **contactEmail** (string, email): Privacy contact email
- **dataTypes** (array): List of data types collected

### Optional

- **thirdParties** (array): Third-party services that receive data
- **effectiveDate** (string, ISO date): Policy effective date (defaults to current date)

### Data Type Object

- **name** (string): Type of data (e.g., "Email Address")
- **description** (string): What this data is
- **purpose** (string): Why you collect it
- **retention** (string, optional): How long you keep it

### Third Party Object

- **name** (string): Service provider name
- **purpose** (string): Why data is shared
- **website** (string, URL, optional): Provider website
- **privacyPolicy** (string, URL, optional): Provider's privacy policy

## Response

```json
{
  "privacyPolicy": "# Privacy Policy for MyApp\n\n**Effective Date:** March 1, 2024\n\n...",
  "metadata": {
    "productName": "MyApp",
    "companyName": "MyCompany Inc.",
    "effectiveDate": "2024-03-01T00:00:00.000Z",
    "generatedAt": "2024-03-07T14:00:00.000Z"
  }
}
```

The `privacyPolicy` field contains a complete Markdown-formatted privacy policy ready for display or storage.

## Template Structure

The generated privacy policy includes:

1. **Introduction** — Overview and acceptance statement
2. **Information We Collect** — Detailed list of data types
3. **How We Use Your Information** — Common use cases
4. **Data Security** — Security measures statement
5. **Third-Party Services** — List of data processors
6. **Data Retention** — Retention policy
7. **Your Rights** — User rights (GDPR-style)
8. **Children's Privacy** — COPPA compliance statement
9. **Changes to Policy** — Update notification process
10. **International Data Transfers** — Cross-border transfer notice
11. **Contact Us** — Support information

## Use Cases

- **SaaS Onboarding**: Generate privacy policies during product setup
- **Compliance Tools**: Quickly create GDPR/CCPA-compliant disclosures
- **Multi-Product Orgs**: Maintain consistent privacy policies across products
- **White-Label Services**: Auto-generate policies for client deployments

## Example Usage (cURL)

```bash
curl -X POST https://api.example.com/api/privacy-policy/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productName": "MyApp",
    "companyName": "MyCompany Inc.",
    "website": "https://myapp.com",
    "contactEmail": "privacy@myapp.com",
    "dataTypes": [
      {
        "name": "Email Address",
        "description": "User email for authentication",
        "purpose": "Account management and communication"
      }
    ]
  }'
```

## Notes

- The template is designed to be **general-purpose** and covers common privacy requirements
- Generated policies should be **reviewed by legal counsel** before publication
- Consider jurisdiction-specific requirements (GDPR, CCPA, etc.)
- Update policies when data practices change
- Store generated policies with version control for audit trails
