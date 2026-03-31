# Booking flow

## Purpose

This document sets out the proposed booking flow for the DTV app, including:

- the basic booking flow
- how logged-in and returning users fit into it
- the corporate / CSR option
- child bookings
- how to handle group bookings for now
- the related privacy, photo / video, and safeguarding policy implications

The aim is to keep the booking journey simple for most people, while allowing for the more complex cases without turning the whole flow into a mess.

---

## Core approach

There is one main booking flow, with a few conditional branches.

The flow changes based on:

- whether we already know the user
- whether they are booking only themselves or also children
- whether the booking is through work / CSR
- whether any extra acknowledgements or profile details are needed

This is better than trying to design separate flows for:

- normal users
- logged-in users
- child bookings
- corporate bookings
- group bookings

Instead, the system should use one shared structure and only show the extra bits when relevant.

---

## Main flow

### 1. Choose session

The user starts on a session page and chooses a session to book.

That page should make the basics clear:

- title
- date and time
- location
- short description
- anything important to know before booking
- clear booking CTA

### 2. Validate email

This is the main identity step for users who are not already recognised.

After email validation, the system should know whether:

- this is a new or returning user
- the user already has a profile
- any child profiles are already linked to that email
- common requirements can be skipped because they are already complete

For logged-in or already-recognised users, this step can often be skipped.

### 3. Who is coming?

After validation, the user chooses who the booking is for.

This should be a simple attendee selection screen.

Suggested content:

- `Me`
- existing linked children as checkboxes
- `+ Add child`

Examples:

- `[x] Me`
- `[ ] Sam Davies`
- `[ ] Ella Davies`
- `+ Add child`

Important points:

- do not auto-select children just because they exist
- selection should be explicit
- the adult remains the accountable booker
- child bookings are handled through the adult's account / email

### 4. Anything else?

This is a light optional step.

For now the main use is the corporate / CSR option.

Suggested content:

- `[ ] This booking is through work / CSR`

This should be easy to ignore and continue past.

### 5. What we still need

This is the dynamic requirements screen.

The system only shows what is still needed for the selected attendees and this booking.

This may include:

- missing profile details
- new child details if a child has just been added
- photo / video choice
- supervision acknowledgement for child bookings
- CSR company name if CSR is selected
- session-specific notices if needed

This should not be framed as a pile of separate consent boxes.

### 6. Confirm booking

The user sees a final summary and confirms.

This should include:

- session summary
- who is booked on
- whether CSR is selected
- company name if provided
- any notices acknowledged
- final confirm button

### 7. Booking confirmed

The success page should show:

- booking details
- what happens next
- how to manage or cancel the booking
- a route back to browse more sessions

---

## Logged-in / returning user journey

A logged-in or recognised user should follow the same overall flow, but with less friction.

### Expected shape

1. Choose session
2. Skip or pass quickly through identity
3. Select who is coming
4. See only any missing requirements
5. Confirm

The important principle is:

**Do not make returning users re-do things unnecessarily.**

That said, the system should still re-surface something if:

- the user has never provided it
- the policy wording has changed and you want a fresh acknowledgement
- the session has a specific notice that needs to be shown

---

## Corporate / CSR option

CSR should not be treated as a whole separate booking flow.

It is just extra booking metadata.

### Proposed UX

On the `Anything else?` screen:

- `[ ] This booking is through work / CSR`

If selected, the next step should show:

- clear DTV charity wording and charity number
- optional `Company name`

### Storage

Company name should be stored primarily on the **booking**.

Reason:

- the same person may attend through different employers over time
- some bookings will be personal and some through work
- reporting works better if the CSR detail is tied to the booking that actually happened

It may also be useful to remember the last-used company name on the user's profile as a convenience default for next time.

### Corporate option summary

- light checkbox
- easy to skip
- optional company name
- stored on booking first

---

## Child bookings

Child bookings should be built around the idea that the adult is the booker and the child is linked to them.

### Working model

- the adult validates with their own email
- existing children linked to that email can be selected quickly
- new children can be added
- the adult remains responsible for the booking
- the adult remains responsible for supervision on the dig unless explicitly stated otherwise

### Why this works

This keeps repeat family bookings easy.

It also avoids turning child bookings into a separate account system.

### Booking structure for children

1. Adult validates email
2. Existing child profiles are shown as options
3. Adult selects relevant child or adds a new child
4. System shows anything still needed
5. Adult confirms booking on behalf of the selected children

### Suggested details for a child profile

Keep this proportionate.

Likely fields:

- child's name
- age or date of birth
- anything genuinely needed for safe participation

Do not add unnecessary friction.

---

## Group bookings

Group bookings are out of scope for now.

### Proposed approach

For now, simply signpost group organisers to contact DTV directly.

Suggested wording:

**Booking for a group? Email admin@dtv.org.uk**

### Reason for deferring

This keeps the main booking journey simple and avoids dragging extra complexity into v1.

Group bookings can still be handled through the admin side manually.

The app can add a fuller group-booking flow later if needed.

---

## Requirements, privacy, photos, and safeguarding

This is the area that needs to stay clean.

The main lesson from discussion is:

**Do not turn everything into multiple separate consent boxes.**

### Better distinction

There are really three different things going on:

1. normal booking/admin data
2. photo / video permissions
3. safeguarding / supervision acknowledgement

These should not all be treated as the same kind of consent.

---

## Privacy / data use

For ordinary booking and attendance data, the booking flow should not ask for repeated "data protection consent" for every person.

A better shape is:

- show a short privacy statement
- link to the full privacy policy
- have one booking-level acknowledgement where needed

This can be written so it clearly covers:

- the adult making the booking
- any children they are booking on behalf of

### Suggested booking wording

- `I have read how DTV uses booking data.`

This should be linked to the privacy policy or a short layered notice.

---

## Photo / video

Photo / video should be kept separate from general privacy / booking data.

This is the part that most naturally fits a real yes / no choice.

### Suggested shape

For the adult:

- `Photos / video for me: Yes / No`

For child bookings:

- `Photos / video for the selected children: Yes / No`

That is much cleaner than separate repeated boxes for each child in the normal booking flow.

If needed later, the system can support per-child overrides or admin-side editing.

---

## Supervision / safeguarding acknowledgement

This should be kept separate from privacy and photo choices.

It is better treated as an acknowledgement or booking condition.

### Suggested wording

- `I understand children remain under parent / guardian supervision during this activity.`

This is simple, clear, and closely aligned with how DTV actually operates.

---

## Child data and the role of the parent

Operationally, DTV deals with the parent or guardian, not directly with the child.

That said, the privacy policy should avoid saying that a child's data "belongs to the parent".

A better way to describe the model is:

- DTV normally collects child information from the parent, guardian, or other authorised adult making the booking
- that adult is responsible for providing the information and making booking choices on the child's behalf where appropriate
- the adult remains responsible for supervision during the activity unless clearly stated otherwise

This keeps the booking model parent-led without using shaky language.

---

## Suggested consent / acknowledgement model in the UI

### Adult-only booking

Show:

- short privacy statement / link
- `Photos / video for me: Yes / No`

### Booking including children

Show:

- short privacy statement / link covering the booking
- `Photos / video for me: Yes / No`
- `Photos / video for the selected children: Yes / No`
- `I am the parent, guardian, or authorised adult for the selected children`
- `I understand children remain under parent / guardian supervision during this activity`

This is enough for v1 and avoids checkbox overload.

---

## Policy updates needed

The booking flow implies a few updates to policy and related wording.

### 1. Privacy policy: children's bookings

Add a section explaining that:

- child information is normally provided by the parent, guardian, or authorised adult making the booking
- that adult is responsible for giving accurate information
- that adult makes booking choices on the child's behalf where appropriate
- DTV uses the information to administer bookings, run activities safely, communicate with the responsible adult, and meet safeguarding responsibilities

### 2. Privacy policy: photo / video

Keep photo / video permissions separate from ordinary booking data.

Explain:

- what the choice is for
- how DTV records it
- how it is respected in practice

### 3. Privacy policy: supervision / safeguarding

Add wording making clear that:

- children remain under parent / guardian supervision on digs unless DTV clearly states otherwise for a particular activity
- DTV may use or share information where needed for safeguarding or safety reasons

### 4. Booking wording

Update the booking pages so the language matches the actual model.

In particular, avoid implying that DTV is taking on responsibility for supervising children during normal digs.

---

## Suggested privacy policy wording

This is a rough draft section, not final legal text.

### Children's bookings

Where a booking includes a child, we normally collect the child's information from the parent, guardian, or other authorised adult making the booking. That adult is responsible for providing accurate information, making booking choices on the child's behalf where appropriate, and supervising the child during the activity unless we clearly state otherwise.

We use child booking information to administer bookings, run activities safely, communicate with the responsible adult, and meet our safeguarding responsibilities.

We ask separately about photo and video permissions.

---

## Recommended screens

### Screen 1: Session page

- session details
- key notes
- book CTA
- group booking signpost if relevant

### Screen 2: Validate email

- email input
- validation / recognition step

### Screen 3: Who's coming?

- Me
- existing children
- + Add child

### Screen 4: Anything else?

- CSR checkbox

### Screen 5: What we still need

Dynamic content based on the booking:

- privacy notice / link
- photo / video choices
- child details if needed
- parent / guardian confirmation
- supervision acknowledgement
- optional CSR company name

### Screen 6: Confirm booking

- final summary
- confirm CTA

### Screen 7: Booking confirmed

- success message
- manage / cancel
- browse more sessions

---

## Key design principles

- one shared booking flow
- keep the common path quick
- only show extra steps when needed
- children are linked to the adult booker
- CSR is metadata, not a separate journey
- group bookings are handled by email for now
- do not overload users with unnecessary consent boxes
- keep privacy, photos, and supervision clearly distinct
- make the policy wording match the reality on the ground

---

## Summary

The proposed v1 booking flow is:

1. Choose session
2. Validate email
3. Select who is coming
4. Optionally flag CSR
5. Show only what is still needed
6. Confirm
7. Success page

Children are handled through linked profiles under the adult's email.

CSR is a light optional flag.

Group bookings are out of scope and should be directed to admin@dtv.org.uk.

Policy updates should support a parent-led model for children's bookings, while keeping privacy, photo / video, and supervision wording clear and separate.
