# V2 frontend environment guardrails

This branch is a configuration foundation, not an operational development app.
Do not open it in a network-enabled browser yet. No SDK or dependencies were
installed, no credentials were copied, and no development service was contacted.
Production execution is unauthorized, including when the browser is on orbtech.in.

## Explicit configuration

js/runtime-config.example.js is synthetic and Git-visible. The pages look for
/js/runtime-config.local.js BEFORE loading js/runtime-config.js. The local file
is deliberately absent and ignored; no production defaults or auto-discovery
exist. For a future authorized local setup, manually supply the example's shape
in that ignored file using only an isolated local project's PUBLIC key. Never
put a service-role key, SUPABASE_KEY, billing secret or admin credential there.
Missing configuration leaves static content available and operations unavailable.
A missing local config resource may produce a local 404; it cannot fall back to
production configuration. Do not use file:// or copy production browser storage.

Settings:
- APP_ENV: explicit development or test only.
- DEV_SERVICE_ORIGINS: array of approved local origins.
- SUPABASE_URL and SUPABASE_ANON_KEY: local service URL and public key only.
- WEBSITE_ORIGIN: must equal the current browser origin.
- API_ORIGIN and STREAMLIT_ORIGIN: explicitly allowlisted local origins.
- REPORTS_BUCKET: isolated private report bucket.
- BILLING_MODE and LLM_PROVIDER_MODE: mock only, default mock when omitted.

The synthetic example aligns with backend local origins: website localhost:5173,
API localhost:8000, Streamlit localhost:8501 and Supabase 127.0.0.1:54321.
These addresses are configuration examples, not services started by this task.

## Validation and Supabase boundary

Only localhost, 127.0.0.1 and ::1 browser-service hosts are initially allowed.
Every origin requires explicit permission, including its scheme/port. Known
production OrbTech domains and the production Supabase project are denied even
if listed. Unknown hosted projects are also denied even if manually listed.
URL credentials, paths, queries, fragments, encoded delimiters, backslashes,
control characters and ambiguous numeric hosts are rejected for configuration.

WHATWG URL parsing differs from Python urllib: browsers canonicalize shorthand,
octal and hexadecimal IPv4 forms and remove default ports. Raw-authority checks
therefore precede browser parsing. IPv6 is canonicalized by URL, while Python
uses ipaddress. Frontend schemes must be lowercase; leading-zero ports are
rejected (stricter than Python). Python's canonical origins retain default ports;
browser origins omit them. Local hostnames are not interchangeable: localhost
and 127.0.0.1 are different browser origins. The backend can approve hosted HTTPS
projects; this initial frontend deliberately cannot.

The Supabase factory validates before client construction, selects an
orbtech-v2 environment/origin-specific session namespace, disallows access to
production storage namespaces, disables automatic refresh and URL-session import,
and guards each SDK fetch against current configuration. Redirects use error
mode and ambient cookies are omitted. API keys are never treated as user identity.
A decoded legacy anon-key role is only a credential-type filter; it is NOT token
signature verification or authentication proof. Server-role keys are refused.

No SDK is loaded or initialized automatically. initialize(sdk) is an explicit
factory boundary for future reviewed local SDK provisioning and mocked tests.
OrbSupabase.ready() remains false: all existing account UI initialization stays
disabled, including recovery flows. The factory does not create fake users,
verified sessions or plan entitlements. Signed-in account and storage integration
must be separately reviewed before readiness is enabled.

## Disabled dependencies and features

Original operational dependencies identified and disabled:
- Supabase production project: shared client plus homepage testimonial REST fetch.
- Render API: billing health warm-up, create/cancel subscription and activation polling.
- Production Streamlit URL and .orbtech.in handoff cookie domain.
- Live Razorpay public key and checkout.razorpay.com script.
- GA4/Google Tag Manager and Meta Pixel, regardless of saved production consent.
- Google Fonts/preconnect, floating/pinned Supabase CDN scripts and Three.js CDN.
- Formspree contact submission, including native form submission without JS.

Billing methods return a development-only unavailable notice before session,
fetch, checkout or polling operations. Scanner handoff creates no cookies and
never navigates. ML suspension wording, plan prices and quotas are retained.
Authentication, profile, dashboard and report operations remain unavailable until
local SDK/backend/schema/redirect/storage integration is approved. Existing auth
methods are dormant; no verification bypass or successful-payment simulation exists.

All nine pages place a restrictive CSP before scripts: connect-src 'none',
frame-src 'none', form-action 'none', local scripts/styles/images only (data images
allowed). Thus even LOCAL API integration is blocked at this stage. This policy
must not be loosened until dependency provisioning and local integration review.
The inline allowance preserves existing static scripts/styles; it is not an XSS
security claim. Forms have disabled fieldsets; submission is also intercepted.

Passive canonical/Open Graph/Twitter/JSON-LD references to orbtech.in and schema.org
are retained. They are metadata, not fetched resources. Existing local public PDF
assets, marketing copy, CNAME, sitemap and robots remain. External social/mailto
links remain user-initiated navigation, not automatic application dependencies.
The 3D background, testimonial loader, consent UI and contact transport are disabled;
local styles and a simple menu/reveal fallback preserve readable marketing content.

Browser validation and a meta CSP do not provide complete network isolation.
DNS/hosts changes, malicious same-origin code, explicit external navigation and
process egress remain outside these checks. Use infrastructure egress restrictions
and an isolated browser profile for future authorized integration. No real browser
session or production-service verification was performed here.

## Verification without packages

From D:/orbtech-v2/frontend:

    node --test test_frontend_guardrails.cjs

The runner denies real fetch, HTTP, socket and DNS APIs. Browser contexts use
synthetic configuration and mocked dependencies. It checks unsafe paths, all page
script execution orders, missing config and valid config without an SDK. No real
service, authentication, checkout, cancellation or scanner call occurs.

Syntax is checked with Node's --check for JS/CJS files and vm.Script for inline
scripts; JSON-LD is parsed as JSON. HTML tag structure is checked using Python's
standard-library HTMLParser with a balanced-tag stack. These checks do not replace
visual browser QA. No package manifest/build framework is introduced.

Remaining prerequisites: local SDK version/license/integrity review and provisioning,
complete isolated Supabase bootstrap and synthetic users, Auth redirect/recovery
integration, backend configuration, guarded report-download handling, frontend
runtime integration and reviewed local-only CSP. Backend Streamlit remains disabled.
