## Phase 3.3 Testing Checklist

1) Build
- `npm run build`

2) Lead ingestion
- POST to `/api/leads` with name/email/serviceInterest -> verify lead created in Firestore
- Confirm honeypot `website` field short-circuits (returns ok without write)

3) Lead triage + convert
- Visit `/crm/leads` and open a lead
- Qualify/disqualify lead
- Convert lead with company/contact/opportunity info; verify related docs created and lead marked converted

4) Activities
- Create activity on lead/opportunity pages
- Mark activity done from `/crm/activities` and from activity detail
- Due-soon list highlights items due within 7 days

5) Navigation
- Header shows CRM link and pages render without client Firebase env vars (admin Firestore only)
