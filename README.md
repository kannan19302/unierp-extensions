# unierp-extensions

**Layer L6 — Extensions** of the [UniERP](../unierp-platform) platform.
Depends on: `@unerp/extension-api` **only**.

## What this is

First-party verticals — healthcare, education, real estate, field service — plus templates.

## The invariant this repository owns

**Depends on nothing but the public API.** That constraint is the proof the API is real: if a first-party vertical needs a private hook, the build fails and the hook must be made public.

## The rule that applies everywhere

A repository may depend only on published artifacts of a **strictly lower
layer** — never sideways within a layer, never upward. A cycle is not
discouraged; it is unrepresentable, because the lower layer's package cannot
name the higher one.

See the [platform overview](../unierp-platform/README.md) for the full map, and
[`PLATFORM_ARCHITECTURE.md`](../ERPSys/docs/PLATFORM_ARCHITECTURE.md) § 4.2 for
the reasoning.

## Licence

AGPL-3.0.
