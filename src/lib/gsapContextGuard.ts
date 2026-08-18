// -----------------------------------------------------------------------------
// gsapContextGuard — stop a looping context graph from killing the tab
// -----------------------------------------------------------------------------
// Leaving /about could crash the page outright ("This page couldn't load"). The
// captured error is a RangeError — "Maximum call stack size exceeded" — with a
// stack that is nothing but `Context.getTweens` → `Array.forEach` →
// `Context.getTweens`, repeating until the stack is gone.
//
// GSAP's Context.getTweens (gsap-core, ~L3949) collects a context's tweens by
// recursing into any entry of `data` that is itself a Context:
//
//     this.data.forEach(e => e instanceof Context
//       ? a.push(...e.getTweens())          // ← recurses, with no visited set
//       : e instanceof Tween && ... && a.push(e));
//
// Nothing there guards against a context being reachable from itself, and
// contexts become each other's children implicitly: Context.add (~L3925) runs
//
//     prev && prev !== self && prev.data.push(self)
//
// on EVERY invocation — pushing the child into whichever context happens to be
// active, with no dedupe. That's the shape this site builds all over the place,
// because `useGSAP(() => { const mm = gsap.matchMedia(); mm.add(...) })` nests a
// matchMedia context inside the hook's context. Get one loop into that graph and
// `Context.kill()` — which calls getTweens() before anything else — never
// returns. It takes the tab with it.
//
// So: walk the same graph, in the same order, but never visit a context twice.
// Collecting each context once is what the traversal already means to do — a
// context reached by two paths has no more tweens the second time — so this
// changes no legitimate result. It only removes the ability to loop forever.
//
// This is a SAFETY NET, not a diagnosis. It stops the crash; it does not explain
// which of our components builds the loop. That's what `onCycle` is for: it fires
// the first time a repeat is actually seen, so the root cause can be traced from
// a real reproduction rather than guessed at.
// -----------------------------------------------------------------------------

type GsapLike = {
  context: (fn: () => void) => { constructor: unknown; revert: () => void };
  core: { Tween: unknown };
};

/** Ctor-shaped view of GSAP's internal Context/Tween classes. */
type Ctor = new (...args: never[]) => unknown;
/** A GSAP Context, as far as this module needs to care. */
type ContextLike = { data?: unknown[]; getTweens?: () => unknown[] };

const PATCHED = "__cycleGuarded";

/**
 * Make Context.getTweens cycle-proof. Idempotent, and a no-op if GSAP's
 * internals ever move (we resolve the classes from a live instance rather than
 * reaching into the package, so a mismatch means we simply don't patch).
 *
 * @param onCycle called once per offending traversal, with how many repeat
 *                visits were skipped — a hook for reporting the real bug.
 */
export function guardGsapContextCycles(
  gsap: unknown,
  onCycle?: (info: { skipped: number; rootDataLength: number }) => void,
): void {
  const g = gsap as GsapLike;
  let Context: Ctor;
  let Tween: Ctor;
  try {
    // Resolve Context from a throwaway instance — it isn't exported.
    const probe = g.context(() => {});
    Context = probe.constructor as Ctor;
    probe.revert();
    Tween = g.core.Tween as Ctor;
    if (!Context?.prototype || !Tween) return;
  } catch {
    return; // unfamiliar GSAP build — leave it alone
  }

  const proto = Context.prototype as Record<string, unknown>;
  if (proto[PATCHED]) return;
  proto[PATCHED] = true;

  proto.getTweens = function getTweens(this: ContextLike) {
    const out: unknown[] = [];
    const seen = new Set<unknown>();
    let skipped = 0;

    // Same depth-first order as GSAP's own version, so the tween ordering
    // kill() goes on to sort is unchanged — just with a visited set.
    const walk = (ctx: ContextLike) => {
      if (seen.has(ctx)) {
        skipped++; // reached twice: a duplicate edge, or a genuine loop
        return;
      }
      seen.add(ctx);
      const data = ctx.data;
      if (!data) return;
      for (const e of data) {
        if (e instanceof (Context as never)) {
          walk(e as ContextLike);
        } else if (
          e instanceof (Tween as never) &&
          !((e as { parent?: { data?: unknown } }).parent?.data === "nested")
        ) {
          out.push(e);
        }
      }
    };
    walk(this);

    if (skipped && onCycle) {
      onCycle({ skipped, rootDataLength: this.data?.length ?? 0 });
    }
    return out;
  };
}
