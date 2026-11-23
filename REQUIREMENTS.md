# Requirements checklist

Costs are estimates. Check each provider's pricing page before signing up.

## 1. The business (start now, this takes longest)
- [ ] A willing business with lots of WhatsApp bookings: salon, barber, mechanic or clinic
- [ ] Agreement: free pilot in exchange for a case study, before/after numbers and a short testimonial (in writing)
- [ ] A phone number for the bot. Recommended: a new SIM used only for the bot. Using their existing WhatsApp number may be possible but is more complicated
- [ ] `business/business-info.yaml` filled in: services, prices, durations, hours, staff, booking rules, deposit and cancellation policy
- [ ] `business/faq.md` filled in: their 15–20 most common questions, with answers
- [ ] How they book today (paper diary, WhatsApp chat, an app)
- [ ] Baseline, about 2 weeks before launch: messages per day, slow or missed replies, no-shows, minutes per day spent on messages
- [ ] Their Yoco or PayFast account, if taking deposits

## 2. Your accounts (free)
- [ ] Meta developer account and a WhatsApp app (developers.facebook.com), with the free test number added
- [ ] Your own WhatsApp number added as a test recipient
- [ ] Google Cloud project with the Calendar and Sheets APIs enabled, plus OAuth credentials for n8n
- [ ] A Google Calendar and a Google Sheet for the pilot (shared with the owner)
- [ ] Anthropic API key (you have one already). Set a monthly spend limit in the Console

## 3. Approvals and legal
- [ ] WhatsApp message templates submitted and approved (about 1–2 days each): see `whatsapp-templates/templates.md`
- [ ] Meta business verification by the business (company documents). Only needed at go-live, and can take days to weeks
- [ ] POPIA: privacy notice in the first message, consent for reminders, a retention period, and an operator agreement with the owner. See `compliance/`
- [ ] Owner has signed off on the bot's wording and handoff rules

## 4. Build environment
- [x] Node.js (installed: v24) for running n8n locally with `npx n8n`
- [x] cloudflared (installed) so Meta's webhook can reach local n8n during development
- [ ] Hosting for the pilot: decided at go-live. Free-tier cloud servers usually need a card on file, so we'll confirm the costs first

## 5. Time
- [ ] About 1–2 weeks of build time
- [ ] 2–4 weeks of pilot, with a 15-minute weekly check-in with the owner
