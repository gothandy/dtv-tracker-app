# Session Booking Actions

## Known Facts
- Session is either Future or Past
- User is either Public or Logged In
- Attended (past) or Booked (future) = user has non-cancelled entry for session.
- Regular users are automatically booked on sessions and gurenteed a space.
- A New user defined by this being their first session. Spaces can be limited. Or zero for non-open sessions.
- A Repeat user defined by not a regular, and not new.
- Sessions are never Cancelled, booking closes as the session becomes "past".

## Possible Combinations

| User     | Past            | New Space    | Repeat Only  | No Space     |
|----------|-----------------|--------------|--------------|--------------|
| Public   | Login to Upload | Book         | Limited      | Sold Out     |
| New      | Next            | Book         | Next         | Next         |
| Repeat   | Next            | Book         | Book         | Next         |
| Regular  | Next            | Book         | Book         | Book         |
| Booked   | Upload          | Cancel/Child | Cancel/Child | Cancel/Child |

## State Machine

```
If Past Session:

    If Public:
        "Did you attend this session?"
        [Login to upload photos]


    If Logged In:

        If Attended:
            "You attended."
            [Upload photos]

        Else:
            "Like the look of this?"
            [Book on the next one]

Else If Future Session:

    If Public:

        If New Spaces:
            "Space available."
            [Book Here]

        Else If No New and Repeat Spaces:
            "Limited availability."
            [Login to Book]

    If Logged In and Booked:

        "You're all booked on."
        [Cancel]
        "or"
        [Add Child] {if Child Space}

    Else If Can Book:
            "Space available."
            [Book here]
            {Child Message}

        Else If Cannot Book and Repeat Spaces:
            "Limited availability."
            [Next Session]

        Else If No New and No Repeat:
            "Sold out."
            [Next Session]

    Else No New and No Repeat:

        "Sold out."
        [Next Session]

```