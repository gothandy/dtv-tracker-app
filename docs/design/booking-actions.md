# Session Booking Actions

## Known Facts
- Session is either Future or Past
- User is either Public or Logged In
- Attended (past) or Booked (future) = user has non-cancelled entry for session.
- Regular users are automatically booked on sessions and guaranteed a space.
- A New user defined by this being their first session. Spaces can be limited. Or zero for non-open sessions.
- A Repeat user defined by not a regular, and not new.
- Sessions are never Cancelled, booking closes as the session becomes "past".


## Possible Combinations

| User      | Past            | New Space    | Repeat Only   | No Space     |
|-----------|-----------------|--------------|---------------|--------------|
| Public    | Login Upload    | New Book     | Limited Space | Sold Out     |
| Has Entry | Upload          | Booked       | Booked        | Booked       |
| New       | Next Session    | New Book     | No New        | Sold Out     |
| Repeat    | Next Session    | Repeat Book  | Repeat Book   | Sold Out     |
| Regular   | Next Session    | Regular Book | Regular Book  | Regular Book |


## Call To Action Type
| Key           | Text                                 | Buttons                  | Child   |
|---------------|--------------------------------------|--------------------------|---------|
| Login Upload  | "Did you attend this session?"       | [Login to upload photos] |         |
| Upload        | "You attended this session."         | [Upload Photos]          |         |
| Next Session  | "Like the look of this?"             | [View the Next]          |         |
| New Book      | "Space available."                   | [Book Now]               | Message |
| Booked        | "You're booked on."                  | [Cancel]                 | Button  |
| Repeat Book   | "You've been before?"                | [Book Again]             | Message |
| Regular Book  | "As a regular, we save you a space." | [Book to Confirm]        | Message |
| Limited Space | "Limited Availability."              | [Login to Check]         | Message |
| No New        | "Only for returning volunteers."     | [View an Alternative]    | Message |
| Sold Out      | "Sold Out"                           | [View the Next]          |         |

## Child Logic

### Message
```
    If child limit is 0:
        "Adult only session."

    Else if child limit is not set:
        "Children welcome."

    Else if child spaces = 0:
        "No child spaces remaining."

    Else if child spaces > 0:
        "X child spaces remaining."
```

### Button
```
    if child spaces > 0 or child limit is not set:
        show [Add Child Booking]
```

## Cancelled

If space is available then user can rebook. Same logic as booking. Only additional note below the main text and buttons.

### Message
```
    "You cancelled your original booking."
```