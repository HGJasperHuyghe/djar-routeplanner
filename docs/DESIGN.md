---
name: Kinetic Vitality
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#3f4949'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#6f7979'
  outline-variant: '#bec8c8'
  surface-tint: '#1b686b'
  primary: '#004244'
  on-primary: '#ffffff'
  primary-container: '#005b5e'
  on-primary-container: '#8bd0d3'
  inverse-primary: '#8dd2d5'
  secondary: '#974723'
  on-secondary: '#ffffff'
  secondary-container: '#ff996d'
  on-secondary-container: '#772f0b'
  tertiary: '#3b3a3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#525150'
  on-tertiary-container: '#c7c4c3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a8eff2'
  primary-fixed-dim: '#8dd2d5'
  on-primary-fixed: '#002021'
  on-primary-fixed-variant: '#004f52'
  secondary-fixed: '#ffdbcd'
  secondary-fixed-dim: '#ffb597'
  on-secondary-fixed: '#360f00'
  on-secondary-fixed-variant: '#79310d'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c9c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#484646'
  background: '#f9f9f9'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
  deep-teal: '#005B5E'
  kinetic-orange: '#E6855B'
  soft-shell: '#F7F3F2'
  pure-white: '#FFFFFF'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  max-width: 1280px
---

> Source of truth: `C:\Users\jaspe\Documents\landingpage-djar\DESIGN.md` (DJAR
> brand design system, "Kinetic Vitality"). Copied here verbatim so this repo
> doesn't depend on a sibling project existing. The brand narrative below was
> written for a fitness/coaching product — apply the same tokens, type scale,
> elevation, and shape language to this route-planning app; ignore the
> fitness-specific copy (e.g. "workouts", "coaching") and substitute
> route-planning equivalents (e.g. a "chip" style used for coaching status can
> be reused for "stop" status like geocoded / failed / depot).

## Brand & Style

This design system embodies a high-performance, energetic lifestyle brand that bridges the gap between professional athletic coaching and approachable personal wellness. The visual narrative is driven by **Corporate Modernism with a Kinetic Edge**, utilizing a disciplined layout structure punctuated by vibrant, high-energy accents.

The target audience is motivated individuals seeking transformation, so the UI must evoke feelings of momentum, clarity, and authority. The aesthetic relies on crisp geometry, generous white space to allow high-quality photography to breathe, and a sophisticated interplay between deep teals and energetic terracotta tones. It avoids the "gritty" clichés of traditional gyms in favor of a clean, premium, and data-driven digital experience.

## Colors

The palette is anchored by **Deep Teal**, representing stability and professional depth, used for primary actions and structural headings. **Kinetic Orange** serves as the high-impact accent, reserved for critical calls-to-action (CTAs), progress indicators, and highlights that need to "pop" against the background.

**Soft Shell** is the primary background color for container-level separation, providing a warmer, more premium feel than pure white, while **Pure White** is used for card surfaces and section backgrounds to maintain a fresh, airy atmosphere. Text is primarily rendered in **Black** or very dark variations of the Teal to ensure maximum legibility and a grounded, authoritative feel.

## Typography

The typographic strategy uses **Montserrat** for all headlines and labels to project a bold, geometric, and modern identity. Its wide aperture and sturdy construction mirror the physical strength associated with the brand. Display sizes utilize tighter letter spacing and heavy weights to create maximum impact.

For body text, we use **Be Vietnam Pro** (a contemporary alternative to Poppins that offers better readability at smaller scales). It maintains the friendly, open character required for coaching content while providing a clean, professional aesthetic. All uppercase labels should have increased letter spacing to enhance scanability and give a "technical" feel to fitness data. (In this app, apply that same treatment to route/stop data — distances, durations, stop counts.)

## Layout & Spacing

This design system utilizes a **Fluid Grid** with a strictly enforced 8px base unit. The layout is centered around a 12-column grid for desktop and a 4-column grid for mobile.

Spacing is intentionally generous (Macro-spacing) between sections to communicate a "premium" lifestyle feel, while Micro-spacing within components remains tight and disciplined to ensure data density is manageable. Components should prioritize vertical stacks on mobile, reflowing into multi-column spans on desktop — in this app, that means the stop list stacks above the map on mobile and sits side-by-side with it on desktop.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** and **Subtle Glassmorphism** rather than heavy shadows.

1.  **Level 0 (Surface):** The main background (Soft Shell or Pure White).
2.  **Level 1 (Cards):** Pure White surfaces with a very soft, 4% opacity neutral-color shadow or a 1px border in the Soft Shell color.
3.  **Level 2 (Overlays):** Navigation bars and sticky headers should use a backdrop-blur (12px) with a semi-transparent White or Deep Teal tint (85% opacity) to maintain context of the content beneath.

This approach keeps the UI feeling light, fast, and athletic, avoiding the "cluttered" feeling of traditional skeuomorphism.

## Shapes

The shape language is **Rounded**, striking a balance between hard and soft edges.

-   **Primary Buttons & Inputs:** Use a 0.5rem radius (Standard) to appear approachable yet professional.
-   **Cards & Containers:** Use a 1rem radius (Large) to create a soft frame for the map and stop list.
-   **Media & Badges:** Use a 1.5rem radius (Extra Large) or full pill-shape for badges (e.g. a "depot" pin badge, or a stop-status chip) to distinguish them from interactive buttons.

Consistent rounding across all elements creates a cohesive, "friendly-pro" ecosystem.

## Components

### Buttons
Primary buttons use a solid **Deep Teal** background with white text (e.g. "Optimize route"). The "Secondary/Action" button uses **Kinetic Orange** to draw immediate attention (e.g. "Export" actions). Hover states should involve a slight darkening of the color or a subtle upward shift (2px) to simulate tactility.

### Input Fields
Fields should be clean with a 1px border in a muted Teal-gray. Focus states utilize a 2px **Deep Teal** border. Labels are always placed above the field in the **label-sm** Montserrat style.

### Cards
Cards are the primary vehicle for content (the stop list panel, the route summary panel). They feature a white background, the 1rem border radius, and a subtle drop shadow.

### Chips & Badges
Use the **pill-shaped** radius with a low-opacity background of the primary color (e.g. 10% Deep Teal) and high-contrast text — e.g. a stop's numbered order badge, or a "depot" pin.

### Progress Indicators
Loading/progress states (e.g. CSV geocoding progress) should exclusively use **Kinetic Orange** against a **Soft Shell** track to symbolize energy and completion.
