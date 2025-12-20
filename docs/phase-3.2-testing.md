## Phase 3.2 Testing Checklist

1) Build and dev server
- `npm run build`
- `npm run dev`

2) Public route sanity (no auth required)
- Visit `/`, `/services`, `/services/{published-slug}`, `/approach`, `/case-studies`, `/case-studies/{published-slug}`, `/reviews`, `/contact`

3) Conversion plumbing
- Submit Contact form → verify Firestore `leads` and `marketingEvents` entries
- Submit Service Inquiry form → verify `serviceInterests` + `urgencyScore` are stored
- Click Book a consult → verify `marketingEvents` entry with type `book_consult_click`

4) Publishing gates
- Ensure only `status: published` services, case studies, and testimonials render publicly

5) Environment safety
- Confirm public pages render without Firebase client env vars; admin Firestore is used server-side
