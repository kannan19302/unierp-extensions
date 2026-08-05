# Contributing to unierp-extensions

This repository is **L6 — Extensions** in the UniERP layered architecture.
It may depend on **`@unerp/extension-api` **only****, and nothing else.

## The rule that matters most here

**Depends on nothing but the public API.** That constraint is the proof the API is real: if a first-party vertical needs a private hook, the build fails and the hook must be made public.

## Before you push

```bash
npm install
node scripts/check-layer.mjs   # if present: asserts the layer rule
npx tsc --noEmit
```

A dependency on a higher or sideways layer will fail CI. That is deliberate: the
whole reason this is a polyrepo rather than a monorepo is that the boundary
becomes impossible to cross rather than merely discouraged.

## Standards

See [`unierp-platform/CONTRIBUTING.md`](../unierp-platform/CONTRIBUTING.md) for
the platform-wide non-negotiables — tenant isolation, route guards, money as
Decimal, and never suppressing a check to make it pass.
