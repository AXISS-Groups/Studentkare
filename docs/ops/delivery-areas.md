# Delivery by pincode and area

Checkout refuses a home delivery unless the provider has said it delivers there.
Pickup is never checked.

## The rule

A product is delivered only if the seller's provider record is active, offers
delivery, and covers the address:

1. **Pincode.** The provider sits in the pincode or lists it.
2. **Area.** If the provider lists areas for that pincode, the student's area must
   be one of them. A pincode with no areas listed is served in full.

When it is refused the student is told which of the three it was: the pincode is
not covered, an area must be chosen, or the area is not covered. Each message says
to choose pickup or use another address.

## Where area names come from

One list for everyone: the All India Pincode Directory published by the Department
of Posts on data.gov.in under the Government Open Data Licence - India (GODL-India,
attribution required; it is stored on each row and returned by the areas endpoint).
Each post office in a pincode is one area: "Kukatpally S.O" is the area Kukatpally.
Students pick from this list and providers' areas must come from it, so a spelling
difference can never refuse a real delivery.

## Loading the directory

Download the directory CSV yourself, then:

```sh
# see what would be loaded
python backend/scripts/load_pincode_directory.py --csv /path/to/pincode.csv --state Telangana

# load it
DATABASE_URL=postgresql://... python backend/scripts/load_pincode_directory.py \
    --csv /path/to/pincode.csv --state Telangana --confirm

python backend/scripts/load_pincode_directory.py --status
```

`--state` keeps one state's rows; leave it out for all of India (about 19,000
pincodes and 157,000 areas in the copy tried on 2026-11-14). Re-running replaces the
areas of every pincode in the file. The script fetches nothing itself.

## Setting where a provider delivers

Super admin only, through the ops API (an admin screen is the next piece of work):

```http
PATCH /api/ops/service-providers/{id}
{"deliveryAvailable": true,
 "serviceablePincodes": ["500072", "500090"],
 "serviceableAreas": {"500090": ["Bachupally", "Nizampet"]}}
```

- Sending `serviceablePincodes` replaces the list. Areas of a pincode that is no
  longer listed are dropped.
- Sending `serviceableAreas` replaces the areas. Every key must be one of the
  provider's pincodes, and every name must be an area the directory lists for it;
  otherwise the request is refused with the reason. An empty list for a pincode
  means the whole pincode.
- `GET /api/pincodes/{pincode}/areas` returns the areas to choose from.

## Things to know

- Until a provider's pincodes are filled in, its home deliveries are refused.
- A provider's areas are not changed by reloading the directory. If the directory
  renames an area a provider had listed, deliveries to it are refused until the
  provider's areas are saved again.
- The checkout screens do not show an area picker yet. Until they do, do not list
  areas for a provider: students would be asked for an area they cannot give.
