// -----------------------------------------------------------------------------
// gsapContextGuard — stop a looping context graph from killing the tab
// -----------------------------------------------------------------------------
// Leaving /about crashed the page outright ("This page couldn't load"), with a
// RangeError — "Maximum call stack size exceeded". The cause is a CYCLE in
// GSAP's context graph, which two separate traversals then recurse through
// forever. Both are guarded here, and both guards are needed; see
// guardGsapContextKillCycles for why neither alone is enough.
//
// Traversal 1 — Context.getTweens:
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
// These guards make the CYCLE survivable; they don't stop it forming. GSAP's
// own Context.add is what builds it, so the cycle is still there, silently.
// Both `onCycle` hooks log when they catch one — if those ever start firing,
// that's the signal to go find which component's useGSAP/matchMedia pairing is
// producing it, rather than leaving the graph malformed indefinitely.
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

/**
 * THE FIX. Stop `Context.kill` ↔ `Context.revert` recursing forever.
 *
 * A 200-frame capture of the real crash ends in this, repeating to the bottom:
 *
 *     at e.kill   (chunk:1:45230)
 *     at e.revert (chunk:1:45656)
 *     at e.kill   (chunk:1:45423)
 *     at e.revert (chunk:1:45656)   … forever
 *
 * `Context.revert()` is just `this.kill(config)`, and `Context.kill()` walks its
 * `data` calling `.revert()` on every child context (gsap-core ~L3997:
 * `!(t instanceof Tween) && t.revert && t.revert(revert)`). So a cycle anywhere
 * in that graph — A holds B, B holds A — gives A.kill → B.revert → B.kill →
 * A.revert → A.kill → … and the stack dies, taking the tab with it.
 *
 * The cycle is easy to build by accident because `Context.add` (~L3925) does
 * `prev && prev !== self && prev.data.push(self)` on EVERY invocation, with no
 * dedupe — it pushes a context into whichever context is active at the time.
 * `useGSAP(() => { const mm = gsap.matchMedia(); mm.add(...) })`, used in five
 * components here, is exactly that shape.
 *
 * Fix: refuse to re-enter a kill that is already in progress. Killing a context
 * that is mid-kill is a no-op by definition — it is already being torn down —
 * so this changes nothing legitimate and removes the ability to loop.
 *
 * This is a DIFFERENT recursion from the getTweens one above, and BOTH are
 * required — verified against the real gsap build. With a cycle present,
 * getTweens overflows before kill ever recurses, so the getTweens guard alone
 * left the crash intact (it only moved the stack); and without it, this guard
 * never gets reached. Neither is redundant.
 */
export function guardGsapContextKillCycles(
  gsap: unknown,
  onCycle?: (info: Record<string, unknown>) => void,
): void {
  const g = gsap as GsapLike;
  let Context: Ctor;
  try {
    const probe = g.context(() => {});
    Context = probe.constructor as Ctor;
    probe.revert();
    if (!Context?.prototype) return;
  } catch {
    return;
  }

  const proto = Context.prototype as Record<string, unknown>;
  if (proto.__killGuarded || typeof proto.kill !== "function") return;
  proto.__killGuarded = true;

  const originalKill = proto.kill as (this: unknown, ...a: unknown[]) => unknown;
  const inFlight = new WeakSet<object>();
  let reported = false;

  proto.kill = function guardedKill(this: Record<string, unknown>, ...args: unknown[]) {
    if (inFlight.has(this)) {
      if (!reported) {
        reported = true;
        onCycle?.({
          dataLength: (this as { data?: unknown[] }).data?.length ?? 0,
          isReverted: (this as { isReverted?: boolean }).isReverted,
        });
      }
      return this; // already being torn down — re-entering is what loops
    }
    inFlight.add(this);
    try {
      return originalKill.apply(this, args);
    } finally {
      inFlight.delete(this);
    }
  };
}
