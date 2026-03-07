import{c as h,U as b,C as j,S as w,z as v,i as n,r as m,j as e,H as N,B as k,e as S,D as x,a as d,b as u,L as C}from"./index-BsBsMrCC.js";import{Z as A}from"./zap-CFEOSqy-.js";import{A as P}from"./arrow-right-Di0NnGPs.js";import{C as I}from"./chevron-right-CUlMaX0H.js";import{B as T}from"./book-open-DCrbGWcB.js";import{F as E}from"./file-text-CxqCAn2n.js";/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=h("LifeBuoy",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m4.93 4.93 4.24 4.24",key:"1ymg45"}],["path",{d:"m14.83 9.17 4.24-4.24",key:"1cb5xl"}],["path",{d:"m14.83 14.83 4.24 4.24",key:"q42g0n"}],["path",{d:"m9.17 14.83-4.24 4.24",key:"bqpfvv"}],["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}]]);/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=h("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]),p=[{id:"getting-started",title:"Getting Started",description:"New here? Start with the basics.",icon:A},{id:"account",title:"Account & Profile",description:"Manage your account settings and profile.",icon:b},{id:"billing",title:"Billing & Plans",description:"Subscriptions, invoices, and plan changes.",icon:j},{id:"security",title:"Security & Privacy",description:"Keep your account safe and your data private.",icon:w},{id:"integrations",title:"Integrations & API",description:"Connect your tools and use our API.",icon:v},{id:"troubleshooting",title:"Troubleshooting",description:"Stuck? Find solutions to common issues.",icon:G}],c=[{id:"1",slug:"quick-start",title:"Quick start guide",excerpt:"Get up and running in under 5 minutes. Create your account, set up your workspace, and launch your first project.",categoryId:"getting-started",readingTime:3,tags:["setup","onboarding"],content:`
## Quick Start Guide

Welcome to ${n.name}! This guide will walk you through creating your account and launching your first project.

### Step 1 — Create your account

Navigate to the [register page](/auth?tab=register) and fill in your details. You'll receive a verification email — click the link inside to activate your account.

### Step 2 — Set up your workspace

Once logged in, you'll land on your dashboard. Click **New Project** to create your first workspace. Give it a name and choose a plan that fits your needs.

### Step 3 — Invite your team

Go to **Settings → Team** to invite collaborators. Team members receive an email invitation and can join immediately.

### Step 4 — You're ready!

That's it. Explore the dashboard, connect your integrations, and start building.
    `.trim()},{id:"2",slug:"dashboard-overview",title:"Dashboard overview",excerpt:"Understand each section of your dashboard and how to navigate the interface efficiently.",categoryId:"getting-started",readingTime:4,tags:["dashboard","navigation"],content:`
## Dashboard Overview

Your dashboard is the central hub for all your activity.

### Navigation sidebar

The left sidebar contains your main navigation:

- **Home** — your activity feed and quick stats
- **Projects** — all your active projects
- **API Keys** — manage your API credentials
- **Settings** — account and workspace settings

### Stats panel

The top panel shows key metrics at a glance: total projects, usage this month, and recent activity.

### Quick actions

Use the **+ New** button in the top-right to quickly create a new project, invite a team member, or generate an API key.
    `.trim()},{id:"3",slug:"update-profile",title:"How to update your profile",excerpt:"Change your name, email address, avatar, and notification preferences from your account settings.",categoryId:"account",readingTime:2,tags:["profile","settings"],content:`
## Updating Your Profile

Go to **Settings → Profile** to update your personal information.

### Name and email

Click the **Edit** button next to your name or email. Changes to your email address require re-verification — you will receive a confirmation link at the new address.

### Avatar

Click on your avatar thumbnail and upload a new image (JPG, PNG, or GIF, max 2 MB).

### Notifications

Under **Settings → Notifications**, toggle email alerts for activity summaries, security events, and product updates.
    `.trim()},{id:"4",slug:"delete-account",title:"How to delete your account",excerpt:"Permanently delete your account and all associated data. This action cannot be undone.",categoryId:"account",readingTime:2,tags:["account","deletion"],content:`
## Deleting Your Account

Go to **Settings → Account → Danger Zone** and click **Delete Account**.

You will be asked to type your email address to confirm. Once confirmed, all your data — projects, API keys, billing records — will be permanently deleted within 30 days.

**Note:** If you have an active paid subscription, cancel it first to avoid further charges.
    `.trim()},{id:"5",slug:"upgrade-plan",title:"How to upgrade your plan",excerpt:"Move from Starter to Pro or Enterprise in just a few clicks. Your new features activate immediately.",categoryId:"billing",readingTime:3,tags:["billing","upgrade","plans"],content:`
## Upgrading Your Plan

Go to **Settings → Billing → Change Plan**.

### Choosing a plan

- **Starter (Free)** — up to 3 projects, community support
- **Pro ($29/mo)** — unlimited projects, priority support, custom domain
- **Enterprise** — custom pricing, SLA, dedicated support

### Payment

We accept all major credit cards. Payment is processed securely via Stripe. You will receive a receipt by email after each charge.

### Prorating

When you upgrade mid-cycle, we prorate the difference and apply it immediately. Your new limits activate right away.
    `.trim()},{id:"6",slug:"cancel-subscription",title:"How to cancel your subscription",excerpt:"Cancel anytime from your billing settings. You keep access until the end of your billing period.",categoryId:"billing",readingTime:2,tags:["billing","cancel"],content:`
## Cancelling Your Subscription

Go to **Settings → Billing → Cancel Plan**.

Your subscription will not renew at the next billing date, but you keep full access until the end of the current period.

### Refunds

We offer a 14-day money-back guarantee on all paid plans. Contact support within 14 days of your last payment to request a refund.
    `.trim()},{id:"7",slug:"enable-2fa",title:"Enable two-factor authentication",excerpt:"Add an extra layer of security to your account with an authenticator app or SMS.",categoryId:"security",readingTime:3,tags:["2fa","security","authentication"],content:`
## Enabling Two-Factor Authentication

Go to **Settings → Security → Two-Factor Authentication** and click **Enable**.

### Authenticator app (recommended)

1. Download an authenticator app (Google Authenticator, Authy, 1Password).
2. Scan the QR code displayed on screen.
3. Enter the 6-digit code from the app to confirm setup.

### Backup codes

After enabling 2FA, download your backup codes and store them safely. Each code can be used once if you lose access to your authenticator app.

### Disabling 2FA

Go to **Settings → Security** and click **Disable 2FA**. You will be asked to enter a code from your authenticator app to confirm.
    `.trim()},{id:"8",slug:"api-keys",title:"Generating and using API keys",excerpt:"Create API keys to integrate with external tools and automate your workflows programmatically.",categoryId:"integrations",readingTime:4,tags:["api","keys","integration"],content:`
## API Keys

Go to **API Keys** in your dashboard sidebar to manage your keys.

### Creating a key

Click **New Key**, give it a descriptive name (e.g. "Production server"), and copy the key immediately — it will not be shown again.

### Using the key

Include your API key in the \`Authorization\` header:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

### Rotating keys

To rotate a key, create a new one, update your integrations, and then delete the old key.

### Rate limits

API keys are subject to rate limits based on your plan. Pro and Enterprise plans have higher limits. See our [API docs](/docs) for details.
    `.trim()},{id:"9",slug:"cant-login",title:"Can't log in to your account",excerpt:"Forgot your password or locked out? Here's how to regain access quickly.",categoryId:"troubleshooting",readingTime:3,tags:["login","password","access"],content:`
## Can't Log In

### Forgot your password

Go to the [forgot password page](/forgot-password), enter your email, and check your inbox for a reset link. The link expires after 1 hour.

### Account locked

After multiple failed login attempts, your account may be temporarily locked. Wait 15 minutes and try again, or use the password reset flow.

### Email not verified

If you see "Email not verified", check your inbox for the original verification email and click the link. If it expired, log in and request a new one from the banner that appears.

### Still stuck?

Contact us at [${n.supportEmail}](mailto:${n.supportEmail}) and we'll help you recover access.
    `.trim()}];function Y(t,r){if(!r.trim())return t;const a=r.toLowerCase();return t.filter(i=>i.title.toLowerCase().includes(a)||i.excerpt.toLowerCase().includes(a)||(i.tags??[]).some(s=>s.toLowerCase().includes(a)))}function L({value:t,onChange:r}){return e.jsxs("div",{className:"relative max-w-xl mx-auto",children:[e.jsx(x,{className:"absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none"}),e.jsx("input",{type:"search",placeholder:"Search articles…",value:t,onChange:a=>r(a.target.value),className:"w-full rounded-xl border bg-card pl-12 pr-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground","aria-label":"Search help articles"})]})}function F({categories:t,onSelect:r}){return e.jsx("div",{className:"grid gap-4 sm:grid-cols-2 lg:grid-cols-3",children:t.map(({id:a,title:i,description:s,icon:o})=>e.jsx("button",{type:"button",onClick:()=>r(a),className:"text-left group","aria-label":`Browse ${i}`,children:e.jsx(d,{className:"h-full transition-shadow group-hover:shadow-md group-hover:border-primary/40",children:e.jsxs(u,{className:"pt-6 flex flex-col gap-3",children:[e.jsx("div",{className:"flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10",children:e.jsx(o,{className:"h-5 w-5 text-primary"})}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-semibold text-base group-hover:text-primary transition-colors",children:i}),e.jsx("p",{className:"mt-1 text-sm text-muted-foreground",children:s})]}),e.jsxs("div",{className:"flex items-center gap-1 text-xs text-primary font-medium mt-auto",children:["Browse articles ",e.jsx(I,{className:"h-3 w-3"})]})]})})},a))})}function g({article:t}){return e.jsxs(C,{to:`/help/${t.slug}`,className:"flex items-start justify-between gap-4 py-4 border-b last:border-b-0 hover:bg-muted/40 -mx-4 px-4 rounded-lg transition-colors group",children:[e.jsxs("div",{className:"flex items-start gap-3 min-w-0",children:[e.jsx(E,{className:"h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"font-medium text-sm group-hover:text-primary transition-colors truncate",children:t.title}),e.jsx("p",{className:"text-xs text-muted-foreground mt-0.5 line-clamp-2",children:t.excerpt})]})]}),e.jsxs("span",{className:"text-xs text-muted-foreground flex-shrink-0",children:[t.readingTime," min"]})]})}function H({articles:t}){const r=t.slice(0,5);return e.jsxs("section",{className:"mt-16",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-6",children:[e.jsx(T,{className:"h-5 w-5 text-primary"}),e.jsx("h2",{className:"text-xl font-semibold",children:"Popular articles"})]}),e.jsx(d,{children:e.jsx(u,{className:"pt-2 pb-2",children:r.map(a=>e.jsx(g,{article:a},a.id))})})]})}function R({articles:t,query:r}){return t.length===0?e.jsxs("div",{className:"text-center py-16",children:[e.jsx(x,{className:"h-10 w-10 text-muted-foreground mx-auto mb-4"}),e.jsxs("p",{className:"text-lg font-medium",children:['No results for "',r,'"']}),e.jsxs("p",{className:"text-sm text-muted-foreground mt-2",children:["Try different keywords or"," ",e.jsx("a",{href:`mailto:${n.supportEmail}`,className:"text-primary underline underline-offset-4",children:"contact support"}),"."]})]}):e.jsxs("section",{className:"mt-10",children:[e.jsxs("p",{className:"text-sm text-muted-foreground mb-4",children:[t.length," result",t.length!==1?"s":"",' for "',r,'"']}),e.jsx(d,{children:e.jsx(u,{className:"pt-2 pb-2",children:t.map(a=>e.jsx(g,{article:a},a.id))})})]})}function M({categoryId:t,onBack:r}){const a=p.find(o=>o.id===t),i=c.filter(o=>o.categoryId===t);if(!a)return null;const s=a.icon;return e.jsxs("section",{className:"mt-8",children:[e.jsx("button",{type:"button",onClick:r,className:"flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors",children:"← All categories"}),e.jsxs("div",{className:"flex items-center gap-3 mb-6",children:[e.jsx("div",{className:"flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10",children:e.jsx(s,{className:"h-5 w-5 text-primary"})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-semibold",children:a.title}),e.jsx("p",{className:"text-sm text-muted-foreground",children:a.description})]})]}),i.length===0?e.jsx("p",{className:"text-sm text-muted-foreground",children:"No articles in this category yet."}):e.jsx(d,{children:e.jsx(u,{className:"pt-2 pb-2",children:i.map(o=>e.jsx(g,{article:o},o.id))})})]})}function D(){const[t,r]=m.useState(""),[a,i]=m.useState(null),s=m.useMemo(()=>Y(c,t),[t]),o=t.trim().length>0,y=p.map(l=>({...l,articleCount:c.filter(f=>f.categoryId===l.id).length}));return e.jsxs("div",{className:"min-h-screen bg-background",children:[e.jsx(N,{}),e.jsx("section",{className:"bg-muted/40 border-b",children:e.jsxs("div",{className:"container mx-auto px-4 py-16 text-center",children:[e.jsx("h1",{className:"text-4xl font-bold mb-3",children:"How can we help?"}),e.jsx("p",{className:"text-muted-foreground mb-8",children:"Search our knowledge base or browse categories below."}),e.jsx(L,{value:t,onChange:l=>{r(l),i(null)}})]})}),e.jsx("main",{className:"container mx-auto px-4 py-12 max-w-5xl",children:o?e.jsx(R,{articles:s,query:t}):a?e.jsx(M,{categoryId:a,onBack:()=>i(null)}):e.jsxs(e.Fragment,{children:[e.jsxs("section",{children:[e.jsx("h2",{className:"text-xl font-semibold mb-6",children:"Browse by category"}),e.jsx(F,{categories:y,onSelect:i})]}),e.jsx(H,{articles:c})]})}),e.jsx("section",{className:S("border-t bg-muted/30 mt-8",o&&s.length===0?"mt-0":""),children:e.jsx("div",{className:"container mx-auto px-4 py-12 max-w-5xl",children:e.jsxs("div",{className:"flex flex-col sm:flex-row items-center justify-between gap-6 rounded-xl border bg-card p-8",children:[e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:"flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0",children:e.jsx(B,{className:"h-5 w-5 text-primary"})}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-semibold",children:"Still need help?"}),e.jsx("p",{className:"text-sm text-muted-foreground mt-1",children:"Our support team is available Monday–Friday, 9am–6pm UTC."})]})]}),e.jsx("a",{href:`mailto:${n.supportEmail}`,children:e.jsxs(k,{className:"gap-2 flex-shrink-0",children:["Contact Support ",e.jsx(P,{className:"h-4 w-4"})]})})]})})}),e.jsx("footer",{className:"border-t",children:e.jsxs("div",{className:"container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground",children:[e.jsxs("p",{children:["© ",new Date().getFullYear()," ",n.name,". All rights reserved."]}),e.jsxs("div",{className:"flex gap-6",children:[e.jsx("a",{href:"/",className:"hover:text-foreground",children:"Home"}),e.jsx("a",{href:"/privacy",className:"hover:text-foreground",children:"Privacy"}),e.jsx("a",{href:"/terms",className:"hover:text-foreground",children:"Terms"}),e.jsx("a",{href:`mailto:${n.supportEmail}`,className:"hover:text-foreground",children:"Support"})]})]})})]})}const W=Object.freeze(Object.defineProperty({__proto__:null,HELP_ARTICLES:c,HELP_CATEGORIES:p,HelpCenterPage:D},Symbol.toStringTag,{value:"Module"}));export{c as H,B as M,p as a,W as b};
