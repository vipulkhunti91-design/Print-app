# Midnight Gold Design System

## Color tokens

| Token | Value | Use |
|---|---|---|
| Background | `#0A0A0A` | App background |
| Surface | `#171717` | Cards, inputs, forms |
| Surface raised | `#212121` | Raised solid surfaces and glass fallback |
| Border | `rgba(255,255,255,0.10)` | Standard borders |
| Text | `#F2F3F7` | Primary text |
| Text secondary | `#A3A9B8` | Secondary text |
| Text muted | `#6B7280` | Muted text |
| Accent | `#F4D779` | Main primary button, selected radio buttons, active menu icon, total price only (Butter Yellow) |
| Accent pressed | `#E5C765` | Pressed primary button |
| Accent tint | `rgba(244,215,121,0.14)` | Selected radio row tint |
| On accent | `#1A1405` | Text on gold |
| Cool support | `#8FA3FF` | Supporting accent |
| Focus ring | `#FFE9A8` | Keyboard focus |
| Error | `#F87171` | Errors and cancelled/failed status |
| Pending | `#FB923C` | Pending status |
| Processing | `#8FA3FF` | Processing status |
| Ready for pickup | `#A7E8BD` | Ready status (Soft Mint Green) |
| Completed | `#9CA3AF` | Completed status |
| Glass | `rgba(26,30,41,0.6)` | Menu bar, Pay bar, and bottom sheet only |
| Glass border | `rgba(255,255,255,0.10)` | Glass border |

Glass uses `backdrop-filter: blur(20px) saturate(140%)`, a 1px border, and 20px radius. Its solid fallback uses the `surface-raised` token. The app font is Inter; card and button radii are 12px.

## Rules

- Gold is only for the main primary button, selected radio buttons, active menu icon, and total price.
- Text on gold is always `on-accent`.
- Use one primary button per area.
- Cards, inputs, and forms use solid surfaces.
- Glass is only for the menu bar, Pay bar, and bottom sheet.
- Do not use gradients, glow, or heavy shadows.
- Use radio buttons wherever the user picks one option out of 3 or 4.
- Design mobile first at 390 × 844, with 16px side padding and 44px minimum tap targets.
- Use only tokens from `src/theme.css`; never hard-code colors elsewhere.
