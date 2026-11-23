# Case study: an AI enquiry assistant for a small beauty salon

> **Draft.** Everything marked `[OWNER: …]` waits on the salon owner (before-and-after numbers, a quote, and permission to name the salon). Everything else is measured.

## The business and the problem

A one-location beauty salon in South Africa: nails, lashes, skincare, massages, parties and short courses. Bookings arrive through Instagram, WhatsApp, phone and a contact form on the salon's website. The owner does the treatments herself, so enquiries wait until there's a gap between clients.

- Website enquiries per week: `[OWNER: roughly how many]`
- Typical time to first reply: `[OWNER: e.g. same day / next day]`
- What the owner said was hardest: `[OWNER: e.g. answering the same price questions, missing evening messages]`

## Constraints that shaped the design

| Constraint | Consequence |
|---|---|
| WhatsApp (the obvious channel) needs a Meta business account, and the developer's own Meta profile was restricted | Started with the **website form** channel; WhatsApp stays on the roadmap through the owner's own Meta account |
| The website used an embedded Jotform that nobody could edit any more | Replaced it with a **custom form** on the salon's own site (honeypot and minimum fill time against spam), with a switch back to Jotform |
| Budget: zero | Self-hosted n8n on an **Oracle Always Free** VM, Claude Haiku at **~$0.0004 per enquiry**, the owner's existing Google tools |
| Customers' personal data (POPIA) | Consent on the form, least-privilege Google scopes, run history deleted after 30 days, a public privacy page |
| The owner must stay in control | The assistant **never sends replies**: it drafts one, and the owner presses Reply |

## What was built

1. The customer fills in the website form, and the site forwards it to n8n with a shared secret.
2. Claude sorts it into one of 7 intents, judges urgency and whether the owner is needed, and drafts a reply **using only the salon's published prices and policies**. Those come straight from the website's content, so a price change in the site's admin updates the assistant.
3. Code checks the draft instead of trusting it:
   - every price must be on the menu, a multiple of a quoted per-unit price, or a correct total;
   - no booking confirmations;
   - the weekday has to match the date;
   - low confidence goes to the owner;
   - no invented appointment times.
4. Every enquiry is logged to a Google Sheet, and the owner gets an email with the draft. "Reply" goes straight to the customer.
5. **v2 (built, waiting on the owner's calendar):** suggests up to 3 free times from her calendar, using a free/busy-only permission.

## How we know it works

An eval set of **56 labelled enquiries**, written to cover the real mix: prices, bookings, complaints, reschedules, parties, courses, allergies, prompt injection and nonsense. They were labelled by written rules and split into dev (to improve the prompt) and test (scored once).

| Held-out test (n=32) | Result |
|---|---|
| Enquiries that must reach the owner and did | **100% (20/20)** |
| Drafts that confirm a booking | **0** |
| Required prices quoted exactly | 100% |
| Intent accuracy | 93.8% |
| Owner bothered unnecessarily | 8.3% |
| Cost per enquiry | $0.00042 |

The most useful finding came from dev, not test. A prompt change that fixed one problem (over-escalating harmless requests) quietly broke another: "please call me" and a prompt-injection message stopped reaching the owner. Without the eval it would have gone live.

## Rollout and what went wrong

- **Day 1:** form, workflow and hosting live; end-to-end test from the real website.
- **Things that broke, and the fixes:**
  - A freshly deployed n8n had no owner account, so anyone with the URL could have claimed it. It was claimed within minutes, and the deploy checklist now covers it.
  - Google tokens for apps in "testing" mode expire after 7 days. The app was published and reconnected before that could happen.
  - One deploy left n8n stopped for about 10 minutes: a remote script was silently swallowed by `docker compose run`. It was fixed, and later deploys verify the webhook and send a live test enquiry.
  - The calendar permission first chosen couldn't read free/busy. It was swapped for a narrower one, so the app now asks for *less* access than before.

## Results after `[OWNER: n]` weeks

| | Before | After |
|---|---|---|
| Website enquiries per week | `[OWNER]` | `[from the Sheet]` |
| Time to first reply | `[OWNER]` | `[from the Sheet: received vs replied]` |
| Enquiries answered from the draft without edits | n/a | `[OWNER estimate]` |
| Enquiries the assistant flagged for her | n/a | `[from the Sheet: "Needs owner" column]` |
| Running cost | Jotform plan `[OWNER: if any]` | ~R`[n]`/month in AI calls, $0 hosting |

> "`[OWNER: one or two sentences in her words]`"
> `[OWNER: name and salon, or "the owner of a South African beauty salon" if she prefers]`

## What I'd do next

- Turn on calendar suggestions once the owner shares free/busy.
- WhatsApp, through the salon's own Meta business account, reusing the same triage, checks and evals.
- A weekly summary from the Sheet: enquiries, intents, response times.
