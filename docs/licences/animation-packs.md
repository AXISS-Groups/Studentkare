# Animation packs: licences and credits

The animated set (`design/icons/animated/`, shipped as `src/assets/lottie/*.json`) is built from the
packs below. Krishna confirmed on 2026-10-23 that StudentKare holds a licence for every one of them.
Only the processed JSON of the animations the app uses is committed; the packs themselves (zips,
`.aep`, `.ai`, `.fig`, previews) are kept outside the repo and are never offered as a download.

| Pack | Author | Used for | Licence file in the pack |
|---|---|---|---|
| Google Material: 200 Animated Icons (UI Action Category) | Sadjad | `anim-refresh`, `anim-search-off` | `License.jpg` |
| User Interface Animated Icons (200) | Sadjad | the other `anim-*` icons | none in the download; same author and storefront as above, read as the same standard licence |
| Medical Characters Animated Illustration Pack | Shakuro | `scene-*` | `License.pdf` |
| Animated Charts (perfect loop) | not stated in the download | `loop-chart-*` | none in the download |

Brainwave 2.0 (a Figma file) was reviewed but nothing from it ships.

<a id="sadjad"></a>
## Sadjad (standard licence, © 2023 Sadjad)
- **Allowed:** non-exclusive, non-transferable use for personal, commercial, editorial or client work,
  altered or modified, in apps (free and paid), websites and other media.
- **Not allowed:** selling, sub-licensing or redistributing the icons on their own (even free), as part
  of an icon set, or placing them on a website in a complete or archived downloadable form without
  attribution; any use that lets them be redistributed; pornographic, libellous, obscene or
  defamatory material.
- **How we comply:** the icons are recoloured and compiled into the app bundle; no file is downloadable
  on its own, and only 21 of the 400 are shipped.

<a id="shakuro"></a>
## Shakuro (Medical Characters)
- **Allowed:** use and modification in works such as websites and applications.
- **Required:** a link back to Shakuro, or a credit ("link back to this site is required or any credit
  will be much appreciated"). If we promote the resources, we link to Shakuro's resource page, never to
  the download file.
- **Not allowed:** reselling, sub-licensing or redistributing the files on their own or as a separate
  attachment.
- **How we comply:** the public footer on every public page carries "Medical illustrations by Shakuro"
  linking to https://shakuro.com (`ART_CREDIT` in `src/design-system/public-site/publicSiteNav.ts`).
- **Note for review:** the licence text says "personal projects for yourself". StudentKare is a
  commercial product; Krishna has confirmed the licence covers it. Keep the purchase receipt with the
  company records.

<a id="charts"></a>
## Animated Charts
- The download carries no licence file or author credit. Use rests on Krishna's confirmation
  (2026-10-23). If the seller's terms ask for a credit, add it next to the Shakuro credit.
- Use is decorative only: the charts' number layers are removed at build time and the loops appear only
  in empty states, never where they could be read as a person's data.

## Credit line
Medical illustrations by Shakuro (https://shakuro.com). Animated icons by Sadjad.
