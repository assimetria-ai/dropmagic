import{c as p,i as g,r as i,j as e,H as A,e as C,D as S,B as P,L as f,a as x,b as y,y as w}from"./index-BsBsMrCC.js";import{F as W}from"./Footer-DtbV_u4V.js";import{B as E}from"./book-open-DCrbGWcB.js";import{A as b}from"./arrow-right-Di0NnGPs.js";/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=p("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=p("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]),j=["All","Product","Engineering","Design","Company","Tutorials"],k=[{id:"1",slug:"welcome-to-our-blog",title:"Welcome to our blog",excerpt:"Introducing our blog where we share product updates, engineering deep-dives, design thinking, and company news.",category:"Company",author:"The Team",publishedAt:"2024-01-15",readingTime:2,tags:["announcement","company"],content:`
## Welcome to our blog

We're excited to launch our official blog — a place where we'll share what we're building, how we're building it, and why we make the decisions we do.

### What to expect

- **Product updates** — new features, improvements, and what's coming next
- **Engineering posts** — technical deep-dives on our architecture and the problems we solve
- **Design thinking** — how we approach UX, accessibility, and visual design
- **Company news** — team growth, milestones, and behind-the-scenes stories

### Stay in the loop

Subscribe to our newsletter or follow us on social media to be notified when we publish new posts. We aim to publish at least twice a month.

Thanks for being here.
    `.trim()},{id:"2",slug:"how-we-built-our-auth-system",title:"How we built our authentication system",excerpt:"A walkthrough of the trade-offs we considered when designing our auth flow — from password hashing to 2FA and session management.",category:"Engineering",author:"Engineering Team",publishedAt:"2024-02-03",readingTime:7,tags:["engineering","security","auth"],content:`
## How we built our authentication system

Authentication is one of those things that looks simple on the surface but hides a lot of complexity. Here's how we approached it.

### Password storage

We use **bcrypt** with a cost factor of 12 for all password hashes. We never store plaintext passwords or reversible hashes. On every login we re-verify against the stored hash.

### Session management

We use short-lived JWTs (15 minutes) paired with rotating refresh tokens stored in HttpOnly cookies. This gives us the statelessness of JWTs while limiting the blast radius of a stolen token.

### Two-factor authentication

We support TOTP-based 2FA via standard authenticator apps. Backup codes are generated at setup time and stored as individual bcrypt hashes so they can only be used once.

### Rate limiting

Login endpoints are rate-limited per IP and per account to prevent brute-force attacks. After 5 failed attempts, a progressive back-off is applied.

### What's next

We're currently working on passkey (WebAuthn) support and will write a follow-up post once it's live.
    `.trim()},{id:"3",slug:"design-system-v2",title:"Introducing our design system v2",excerpt:"We rebuilt our component library from scratch. Here's what changed, why we did it, and how it makes building faster.",category:"Design",author:"Design Team",publishedAt:"2024-03-12",readingTime:5,tags:["design","components","ui"],content:`
## Introducing our design system v2

After two years of incremental patches, we decided to rebuild our component library from scratch. Here's what we learned.

### Why we rebuilt

The original system grew organically. Over time it accumulated inconsistencies: 17 different shades of grey, three different button sizes that didn't align on a grid, and components that were hard to theme.

### What changed

- **Tokens over magic numbers** — all colours, spacing, and typography are now CSS custom properties sourced from a single token file
- **Accessible by default** — every interactive component ships with proper ARIA attributes and passes WCAG AA contrast requirements
- **Dark mode** — first-class support via the CSS \`prefers-color-scheme\` media query and a manual toggle

### The result

Component count dropped from 94 to 61. Build times are faster. And our designers and engineers now speak the same language.
    `.trim()},{id:"4",slug:"shipping-faster-with-feature-flags",title:"Shipping faster with feature flags",excerpt:"Feature flags let us decouple deployment from release. Here's how we use them to ship more confidently.",category:"Engineering",author:"Engineering Team",publishedAt:"2024-04-20",readingTime:6,tags:["engineering","deployment","best-practices"],content:`
## Shipping faster with feature flags

Deploying to production is not the same as releasing to users. Feature flags are the bridge between the two.

### What are feature flags?

A feature flag is a conditional in your code that lets you turn a feature on or off without a deployment. Flags can target all users, a percentage, or a specific cohort.

### How we use them

- **Trunk-based development** — engineers merge to main daily. Unfinished work is behind a flag so it doesn't affect users.
- **Gradual rollouts** — new features start at 1% of users, then 10%, then 100%. We monitor error rates and latency at each stage.
- **Kill switches** — if a feature causes problems in production, we can turn it off in seconds without a rollback.

### The tooling

We evaluated several vendors and eventually built a lightweight in-house solution backed by our database. The overhead is a single DB read per request, cached in memory for 30 seconds.

### Lessons learned

Flags are powerful but they add cognitive overhead. We enforce a policy: every flag gets a ticket for removal within 90 days of full rollout.
    `.trim()},{id:"5",slug:"product-update-q1-2024",title:"Product update: Q1 2024",excerpt:"A roundup of everything we shipped in the first quarter — new integrations, performance improvements, and a sneak peek at what's coming in Q2.",category:"Product",author:"Product Team",publishedAt:"2024-04-01",readingTime:4,tags:["product","updates"],content:`
## Product update: Q1 2024

Here's everything we shipped between January and March.

### New features

- **Two-factor authentication** — protect your account with TOTP-based 2FA
- **API key scoping** — create keys with read-only or write permissions
- **Dark mode** — system default or manual toggle via Settings
- **CSV export** — download your data from any list view

### Performance improvements

We reduced average page load time by 40% by moving to server-side rendering for static pages and implementing aggressive caching on our API.

### Integrations

We added native integrations with Slack (notifications), GitHub (activity feed), and Zapier (automate anything).

### Coming in Q2

- Team permissions and roles
- Audit log
- Custom webhooks
- Mobile app (beta)

As always, thank you for your feedback. Keep it coming.
    `.trim()},{id:"6",slug:"getting-started-tutorial",title:"Getting started: a step-by-step tutorial",excerpt:"New to the platform? This tutorial walks you through creating your first project and inviting your team in under 10 minutes.",category:"Tutorials",author:"The Team",publishedAt:"2024-05-08",readingTime:8,tags:["tutorial","onboarding","getting-started"],content:`
## Getting started: a step-by-step tutorial

This tutorial will take you from zero to a fully set-up workspace in under 10 minutes.

### Step 1 — Create your account

Go to [/auth?tab=register](/auth?tab=register) and fill in your name, email, and a strong password. You'll receive a verification email — click the link to activate your account.

### Step 2 — Create your first project

Once logged in, click the **+ New Project** button in the top-right corner. Give your project a name and an optional description, then click **Create**.

### Step 3 — Invite your team

Go to **Settings → Team** and enter the email addresses of your collaborators. Each person will receive an invitation email with a link to join.

### Step 4 — Generate an API key

Navigate to **API Keys** in the sidebar. Click **New Key**, name it something descriptive (e.g. "Staging server"), and copy the key. Store it securely — it won't be shown again.

### Step 5 — Explore integrations

Head to **Settings → Integrations** to connect Slack, GitHub, and other tools. Each integration has a step-by-step setup wizard.

### You're ready!

That's all it takes. If you have questions, check out our [Help Center](/help) or reach out to [${g.supportEmail}](mailto:${g.supportEmail}).
    `.trim()}];function I(t){return{id:String(t.id),slug:t.slug,title:t.title,excerpt:t.excerpt??"",content:t.content,category:t.category,author:t.author,publishedAt:t.published_at??t.created_at,readingTime:t.reading_time,tags:t.tags??[]}}function N(t){return new Date(t).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}function B(t,n,o){let s=t;if(n!=="All"&&(s=s.filter(r=>r.category===n)),o.trim()){const r=o.toLowerCase();s=s.filter(l=>l.title.toLowerCase().includes(r)||l.excerpt.toLowerCase().includes(r)||(l.tags??[]).some(c=>c.toLowerCase().includes(r)))}return s}function G({post:t}){return e.jsx(f,{to:`/blog/${t.slug}`,className:"group block",children:e.jsx(x,{className:"h-full transition-shadow group-hover:shadow-md group-hover:border-primary/40",children:e.jsxs(y,{className:"pt-5 pb-6 flex flex-col gap-3 h-full",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2 text-xs text-muted-foreground",children:[e.jsx("span",{className:"rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-medium",children:t.category}),e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(v,{className:"h-3 w-3"}),N(t.publishedAt)]})]}),e.jsx("h2",{className:"text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2",children:t.title}),e.jsx("p",{className:"text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1",children:t.excerpt}),e.jsxs("div",{className:"flex items-center justify-between gap-2 mt-1 text-xs text-muted-foreground",children:[e.jsx("span",{children:t.author}),e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(w,{className:"h-3 w-3"}),t.readingTime," min read"]})]}),e.jsxs("div",{className:"flex items-center gap-1 text-xs text-primary font-medium mt-auto pt-1",children:["Read more ",e.jsx(b,{className:"h-3 w-3 transition-transform group-hover:translate-x-0.5"})]})]})})})}function O({post:t}){return e.jsx(f,{to:`/blog/${t.slug}`,className:"group block",children:e.jsx(x,{className:"transition-shadow group-hover:shadow-md group-hover:border-primary/40",children:e.jsxs(y,{className:"pt-6 pb-6 flex flex-col gap-4",children:[e.jsxs("div",{className:"flex items-center gap-3 text-xs text-muted-foreground",children:[e.jsx("span",{className:"rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-medium",children:t.category}),e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(v,{className:"h-3 w-3"}),N(t.publishedAt)]}),e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(w,{className:"h-3 w-3"}),t.readingTime," min read"]})]}),e.jsx("h2",{className:"text-xl sm:text-2xl font-bold leading-snug group-hover:text-primary transition-colors",children:t.title}),e.jsx("p",{className:"text-muted-foreground leading-relaxed",children:t.excerpt}),e.jsxs("div",{className:"flex items-center justify-between gap-2 mt-2",children:[e.jsx("span",{className:"text-sm text-muted-foreground",children:t.author}),e.jsxs("div",{className:"flex items-center gap-1 text-sm text-primary font-medium",children:["Read article ",e.jsx(b,{className:"h-4 w-4 transition-transform group-hover:translate-x-0.5"})]})]})]})})})}function D(){const[t,n]=i.useState(""),[o,s]=i.useState("All"),[r,l]=i.useState(null);i.useEffect(()=>{fetch("/api/blog").then(a=>a.ok?a.json():Promise.reject()).then(a=>{a.posts&&a.posts.length>0&&l(a.posts.map(I))}).catch(()=>{})},[]);const c=r??k,d=i.useMemo(()=>[...c].sort((a,T)=>T.publishedAt.localeCompare(a.publishedAt)),[c]),u=i.useMemo(()=>B(d,o,t),[d,o,t]),[m,...h]=u;return e.jsxs("div",{className:"min-h-screen bg-background",children:[e.jsx(A,{}),e.jsx("section",{className:"bg-muted/40 border-b",children:e.jsxs("div",{className:"container mx-auto px-4 py-16 text-center max-w-3xl",children:[e.jsx("div",{className:"flex justify-center mb-4",children:e.jsx("div",{className:"flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10",children:e.jsx(E,{className:"h-6 w-6 text-primary"})})}),e.jsx("h1",{className:"text-4xl font-bold mb-3",children:"Blog"}),e.jsx("p",{className:"text-muted-foreground text-lg",children:"Product updates, engineering deep-dives, design thinking, and more."})]})}),e.jsx("section",{className:"border-b bg-background sticky top-0 z-10",children:e.jsxs("div",{className:"container mx-auto px-4 py-3 max-w-5xl flex flex-col sm:flex-row items-center gap-3",children:[e.jsx("div",{className:"flex flex-wrap gap-1.5 flex-1",children:j.map(a=>e.jsx("button",{type:"button",onClick:()=>s(a),className:C("rounded-full px-3 py-1 text-xs font-medium transition-colors",o===a?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"),children:a},a))}),e.jsxs("div",{className:"relative w-full sm:w-56",children:[e.jsx(S,{className:"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"}),e.jsx("input",{type:"search",placeholder:"Search posts…",value:t,onChange:a=>{n(a.target.value),s("All")},className:"w-full rounded-lg border bg-card pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground","aria-label":"Search blog posts"})]})]})}),e.jsx("main",{className:"container mx-auto px-4 py-12 max-w-5xl",children:u.length===0?e.jsxs("div",{className:"text-center py-24",children:[e.jsx(H,{className:"h-10 w-10 text-muted-foreground mx-auto mb-4"}),e.jsx("p",{className:"text-lg font-medium",children:"No posts found"}),e.jsx("p",{className:"text-sm text-muted-foreground mt-2",children:"Try a different category or search term."}),e.jsx(P,{variant:"outline",size:"sm",className:"mt-6",onClick:()=>{n(""),s("All")},children:"Clear filters"})]}):e.jsxs(e.Fragment,{children:[m&&e.jsx("section",{className:"mb-10",children:e.jsx(O,{post:m})}),h.length>0&&e.jsxs("section",{children:[e.jsx("h2",{className:"text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5",children:"More posts"}),e.jsx("div",{className:"grid gap-5 sm:grid-cols-2 lg:grid-cols-3",children:h.map(a=>e.jsx(G,{post:a},a.id))})]})]})}),e.jsx(W,{})]})}const q=Object.freeze(Object.defineProperty({__proto__:null,BLOG_CATEGORIES:j,BLOG_POSTS:k,BlogPage:D},Symbol.toStringTag,{value:"Module"}));export{k as B,v as C,H as T,q as a};
