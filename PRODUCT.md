# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Chronically online internet users who want a blunt, real-time answer to "is the internet cooked?" Primary audience is tech-savvy, enjoys humor, and wants quick status checks on major services without navigating to individual status pages.

## Product Purpose

A status page aggregator that reads public status feeds from major cloud providers, SaaS services, and infrastructure platforms, then delivers one blunt answer about overall internet health. Combines real data with dry, lightly Gen Z commentary. Updates every 15 minutes via a background publisher.

## Positioning

The only status aggregator that combines real vendor status feeds with personality-driven commentary. Not a security claim or incident attribution tool — a "is the internet okay?" dashboard with humor.

## Operating Context

- Browser-based, no login required
- Polls a single public JSON blob (Azure Blob Storage) every 2 minutes
- Shows only services in trouble by default; search finds any service
- Full-screen overlay when publisher goes quiet (>30 min)
- Mobile-responsive

## Capabilities and Constraints

- Reads from public status APIs (AWS, GCP, Azure, Cloudflare, GitHub, etc.)
- Each service has an impact weight (S/M/L/XL/XXL) that determines alert level contribution
- LLM-generated incident summaries via llm.ffilt.us (dry, Gen Z voice)
- 20 built-in fallback lines per status when LLM unavailable
- Static site on Azure Static Web Apps, no server-side rendering
- No vendor affiliation, no authentication

## Brand Commitments

- Name: AreWeFucked.xyz
- Voice: blunt, dry, lightly Gen Z, "main-character energy"
- Tagline: "Real status feeds, blunt commentary"
- Disclaimer: "Not a security claim, not incident attribution, not a source of truth"
- Color scheme: dark theme with glow effects, cyberpunk-adjacent aesthetic

## Evidence on Hand

- Live site at https://arewefucked.xyz
- Public status JSON at Azure Blob Storage
- 20+ service providers monitored
- Incident ledger with LLM summaries

## Product Principles

- Real data first, commentary second — never fabricate status
- Blunt but not alarmist — humor is the delivery, not the message
- Fast to scan — trouble only by default, search for anything
- Link through to vendor status pages — we're a lens, not a source of truth
- Stay online even when feeds fail — stale data with clear marking

## Accessibility & Inclusion

- Semantic HTML with ARIA labels
- Keyboard-navigable search
- Screen reader friendly status announcements
"""