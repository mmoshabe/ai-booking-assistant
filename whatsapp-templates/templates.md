# WhatsApp message templates (submit for Meta approval)

Messages sent **more than 24 hours after the customer's last message** must use a pre-approved template. Replies inside the 24-hour window can be free text. Submit these in WhatsApp Manager under Message templates. Approval usually takes 1–2 days. Category: **Utility** for all of these, as they relate to a booking the customer made.

`{{1}}`, `{{2}}` … are variables that Meta asks for example values for.

## booking_confirmation (Utility)
> Hi {{1}}, your {{2}} at {{3}} is booked for {{4}}. Reply 2 if you need to change it. See you then!

Example values: Thandi · Ladies cut and blow-dry · [Business name] · Fri 28 Nov, 10:00

## appointment_reminder (Utility)
> Hi {{1}}, a reminder of your {{2}} at {{3}} tomorrow at {{4}}. Reply 1 to confirm or 2 to reschedule.

Buttons (quick replies): `Confirm` · `Reschedule`

## deposit_request (Utility)
> Hi {{1}}, to secure your {{2}} on {{3}}, please pay the R{{4}} deposit here: {{5}}. The link expires in {{6}} hours.

## Rules to remember
- Only send reminders to customers who agreed to them (consent is recorded in the Sheet).
- No marketing in Utility templates: Meta re-categorises or rejects them, and marketing templates cost more.
- Keep a copy of the approved wording here, since the n8n workflow refers to templates by name.
