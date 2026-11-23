# Labelling rules

Every case in `cases.jsonl` is labelled by these rules, never by what the model happened to answer. If a rule changes, relabel **all** cases by the new rule.

**Splits:** `dev` is for looking at failures and changing the prompt or checks. `test` is only scored. Never change anything because of a test-split failure; if one teaches us something, write a new dev case for it.

The cases run against the fictional Example Salon ([`knowledge/example.md`](../knowledge/example.md)), with the exact production instructions, schema and guardrail code (`build_workflow.py --eval-bundle`).

## `intent`: pick the first that applies

1. `complaint`: unhappy about a service, staff, a charge or a result (including a reaction after a treatment).
2. `reschedule_or_cancel`: changes an existing booking: move, cancel, running late, or a refund of a deposit.
3. `party_enquiry`: any get-together, bridal party, group or team event, or mobile event.
4. `course_enquiry`: any training course.
5. `booking`: asks to book or come in for a service, including on a specific day (even if it also asks a price).
6. `price_question`: asks what something costs, including discounts, specials or price disputes, without asking to book.
7. `other`: everything else: hours, location, policies, vouchers, lost property, jobs, unclear messages.

## `needs_owner` (the product's ground truth)

**`true`** when the draft can't simply be sent and someone at the salon must decide:
- complaints, refunds, reschedules, cancellations, running late;
- health: allergies, reactions, pregnancy, medical conditions;
- anything about a previous visit;
- every get-together and course (deposits, planning);
- a service, price, payment method or process that isn't in the facts;
- discounts, specials, custom quotes or a price the customer claims;
- the weekday written doesn't match the date picked (the code check flags this);
- the message is unclear, or tries to instruct the assistant.

**`false`** when the facts fully answer it and the draft can go out as is: prices that are on the menu, hours, location, policies, and ordinary booking requests for listed services. For a booking, the draft says the team will confirm the slot, and the owner confirms the booking separately. That isn't an escalation.

## Fact checks (`must_quote`)

Prices that a correct draft has to contain exactly as written in the facts (for example `R1 600`). Leave the list empty when quoting a price isn't required.

## Not scored

The draft's tone, length, and whether it mentions the patch test. Those are reviewed by reading `results/*.md`, not counted.
