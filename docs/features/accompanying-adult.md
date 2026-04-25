# Accompanying Adult

## Relationship Storage

For safe-guarding reasons child volunteers are linked to their accompanying adult via a lookup field stored at two levels:

| Entity | Field | Purpose |
|--------|-------|---------|
| Entry | `AccompanyingAdult` | The adult responsible for this child at this session |
| Regular | `AccompanyingAdult` | The adult for a child regular; copied to the Entry when regulars are added to a session |

Both fields are lookups to the Profiles list.

## Child Detection (Current)

A child entry is currently identified by two signals:

- `#Child` in `Entry.Notes` — the operational tag; also controls visibility of the AccompanyingAdult dropdown in the edit modal
- `Entry.AccompanyingAdultLookupId` being set — already the canonical source for `isChild` in entry stats

The `#Child` tag and the lookup are expected to be kept in sync manually.

## Session Stats

When entry stats are computed, `snapshot.isChild` is set when `AccompanyingAdult` is present. This feeds into the session-level `child` count stored in `Session.Stats`, surfaced as `childCount` in session API responses.

## Eventbrite Sync

During Eventbrite sync, children are identified from `ticket_class_name` containing "child". The accompanying adult is resolved by `resolveAccompanyingAdult()`, which finds the adult ticket holder on the same Eventbrite `order_id`. `AccompanyingAdult` is then set directly on the entry — no `#Child` tag is written by the sync.

## Future Work

- Remove `#Child` from `Entry.Notes` — `isChild` is already fully derived from `AccompanyingAdult` being set.
- Let the UI alone handle whether the AccompanyingAdult dropdown in the edit modal on the lookup field displays, not the presence of the tag.
- Warnings added to the profile stats where data looks wrong.
