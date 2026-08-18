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
 * Note this is a DIFFERENT recursion from the getTweens one above and from the
 * revert/render depth guard below; each guards a distinct path, and only this
 * one matches the captured stack.
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

/** How deep the revert/render cycle may nest before we call it a runaway. A
 *  legitimately nested timeline reverts maybe a dozen levels deep; a runaway
 *  reaches thousands in milliseconds, so 100 separates them with room to spare. */
const MAX_REVERT_DEPTH = 100;

/**
 * Break — and identify — a runaway `Animation.revert` recursion.
 *
 * The captured crash is a stack overflow whose repeating unit is
 * `revert → totalTime → render → render → styleSaver.revert`, i.e. reverting an
 * animation renders something that reverts again, forever. A stack trace can't
 * name the culprit: an overflow stack is thousands of frames deep and the
 * browser only keeps the innermost ~50, so the frame identifying OUR animation
 * is always below the cut. The only way to see it is to catch the recursion
 * while it is still shallow enough to inspect.
 *
 * So: count re-entrancy, and at the limit stop recursing (returning the
 * animation un-reverted, which beats a dead tab) and hand the offending
 * animation to `onRunaway` — described, since by then we have it in hand.
 *
 * @param onRunaway called once per page life, with a description of the
 *                  animation that was looping.
 */
export function guardGsapRevertRecursion(
  gsap: unknown,
  onRunaway?: (info: Record<string, unknown>) => void,
): void {
  const core = (gsap as {
    core?: { Animation?: Ctor; Timeline?: Ctor; Tween?: Ctor };
  }).core;
  const proto = core?.Animation?.prototype as Record<string, unknown> | undefined;
  if (!proto || typeof proto.revert !== "function" || proto.__revertGuarded) return;
  proto.__revertGuarded = true;

  // ONE depth shared by revert and render. The captured stack cycles between
  // them — revert → totalTime → render → render → styleSaver.revert — so a
  // counter on either method alone can sit at 1 forever while the other spins.
  // Render is also where a Flip timeline's own revert() override lands, which
  // shadows this prototype and would otherwise slip past entirely.
  let depth = 0;
  let reported = false;

  const describe = (a: Record<string, unknown>) => {
    const targets = (a as { targets?: () => unknown[] }).targets;
    let described: string[] = [];
    try {
      described = (typeof targets === "function" ? targets.call(a) : [])
        .slice(0, 4)
        .map((t) =>
          t instanceof Element
            ? `${t.tagName.toLowerCase()}.${String(t.className).slice(0, 40)}` +
              (t.isConnected ? "" : " [DETACHED]")
            : Object.prototype.toString.call(t),
        );
    } catch {
      /* targets() isn't available on every animation type */
    }
    return {
      kind: a?.constructor?.name,
      data: String((a as { data?: unknown }).data ?? ""),
      vars: Object.keys(((a as { vars?: object }).vars || {}) as object).slice(0, 12),
      targets: described,
      depth,
    };
  };

  /** Wrap `name` on `target` so it shares the runaway counter. */
  const wrap = (target: Record<string, unknown> | undefined, name: string, why: string) => {
    if (!target || typeof target[name] !== "function") return;
    const original = target[name] as (this: unknown, ...a: unknown[]) => unknown;
    target[name] = function guarded(this: Record<string, unknown>, ...args: unknown[]) {
      if (depth >= MAX_REVERT_DEPTH) {
        if (!reported) {
          reported = true;
          onRunaway?.({ ...describe(this), caughtIn: why });
        }
        return this; // stop recursing — un-reverted beats a dead tab
      }
      depth++;
      try {
        return original.apply(this, args);
      } finally {
        depth--;
      }
    };
  };

  wrap(proto, "revert", "Animation.revert");
  wrap(core?.Timeline?.prototype as Record<string, unknown>, "render", "Timeline.render");
}
