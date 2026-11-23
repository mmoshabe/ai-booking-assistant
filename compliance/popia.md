# POPIA compliance pack (draft)

This is a practical starting point for a small pilot, **not legal advice**. If the business handles health information (for example a clinic), that is special personal information under POPIA: get proper advice before launch.

## Roles
- **Responsible party:** the business. It decides why and how customer data is used.
- **Operator:** you, processing customer data on the business's behalf. POPIA requires a written agreement (see below).

## What data is collected, and why
| Data | Why | Kept for |
|---|---|---|
| WhatsApp number, name | To reply and to identify the booking | Retention period below |
| Booking details (service, time) | To make and manage the booking | Retention period below |
| Message content | To answer the question; quality checks | 30 days, then deleted |
| Consent to reminders (yes/no + date) | Legal basis for reminder messages | As long as the customer is active |
| Payment status (paid/unpaid, not card details) | Deposit tracking | Retention period below |

Card details never pass through the bot: Yoco/PayFast handle payment on their own pages.

**Retention period (agree with owner):** 12 months after the last booking, then deleted from the Sheet.

## Privacy notice (first message to every new customer)
> Hi! I'm [Business]'s booking assistant (an automated system). I can answer questions and book appointments. Your name, number and booking details are used only to manage your bookings and are kept for 12 months. Reply STOP at any time to stop messages, or HUMAN to talk to [owner name]. Privacy details: [link or "ask us"].

## Consent for reminders
> Would you like a reminder the day before your appointment? Reply YES or NO.

Record the answer and its date in the Sheet. No YES means no reminder template is sent.

## Customer rights (how they're handled)
- **Access or deletion request:** goes to the owner (handoff). The owner asks you, and you delete the rows within 7 days and confirm.
- **STOP:** the number is flagged and no further messages are sent.

## Operator agreement (one page, signed by both)
1. You process customer data only to run the booking assistant, on the owner's instructions.
2. You keep it confidential and secure: access-controlled accounts, no copies outside the agreed systems.
3. You notify the owner within 72 hours of any suspected data breach.
4. At the end of the pilot you hand over or delete all data, as the owner chooses.
5. Sub-processors used: Meta (WhatsApp), Google (Calendar/Sheets), Anthropic (AI answers), n8n host, Yoco/PayFast.
6. Note for the owner: messages are processed outside South Africa by these providers. Mention this in the privacy notice.
