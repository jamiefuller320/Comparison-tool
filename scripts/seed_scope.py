"""Seed geography for the economic initial scope (shared with src/lib/seedScope.ts)."""

# Matches school localAuthority / DfE LA labels in the harvested index
# (Hampshire County Council area — not Southampton or Portsmouth unitaries).
SEED_LOCAL_AUTHORITY = "Hampshire"


def is_seed_local_authority(name: str | None) -> bool:
    if not name:
        return False
    return name.strip().lower() == SEED_LOCAL_AUTHORITY.lower()
