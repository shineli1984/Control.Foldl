const daggy = require('daggy')
const Maybe = require('data.maybe')
const r = require('ramda')

/**
 * Fold a b =
 *   forall x. Fold (x -> a -> x) -> x -> (x -> b)
 *                    step         begin    done
 */
export const Fold = daggy.tagged('Fold', ['step', 'begin', 'done'])

/**
 * FoldM m a b =
 *   forall x. FoldM (x -> a -> m x) -> (m x) -> (x -> m b)
 *                      step            begin       done
 */
export const FoldM = daggy.tagged('Fold', ['step', 'begin', 'done'])
const Pair = daggy.tagged('Pair', ['_1', '_2'])
const div = a => b => a / b
const id = a => a
const always = (a, _) => a

Fold.prototype.reduce = function(as) {
  const con = (a, k) => x =>
    k(this.step(x, a))

  return r.reduceRight(con, this.done, as)(this.begin)
}

// Functor
Fold.prototype.map = function(f) {
  return Fold(this.step, this.begin, a => f(this.done(a)))
}


// Applicative
Fold.prototype.of = b =>
  Fold(_ => _ => null, null, _ => b)

Fold.prototype.ap = function(right) {
  const left = this

  const step = (p, a) =>
    Pair(
      left.step(p._1, a),
      right.step(p._2, a)
    )

  const begin = Pair(
    left.begin, right.begin
  )

  const done = p =>
    left
      .done(p._1)
           (right.done(p._2))

  return Fold(
    step,
    begin,
    done
  )
}

FoldM.prototype.reduce = function(as) {
  const con = (a, k) => x =>
    this.step(x, a).chain(k)

  return this.begin.chain(
    b => r.reduceRight(con, this.done, as)(b)
  )
}

// Functor
FoldM.prototype.map = function(f) {
  return FoldM(
    this.step,
    this.begin,
    x => this.done(x).chain(f)
  )
}

// Applicative
FoldM.prototype.ap = function(right) {
  const left = this
  return FoldM(
    p => a =>
      left
        .step(p._1, a)
        .chain(_1 =>
          right
            .step(p._2, a)
            .chain(_2 =>
              Pair(_1, _2)
            )
        ),
    left.begin.chain(l =>
      right.begin.chain(r =>
        Pair(l, r)
      )
    ),
    x =>
      left
        .done(x._1)
        .chain(f =>
          right
            .done(x._2)
            .chain(v =>
              f(v)
            )
        )
  )
}

export const generalize = Monad => ({step, begin, done}) =>
  FoldM(
    (acc, cur) => Monad.of(step(acc, cur)),
    Monad.of(begin),
    x => Monad.of(done(x))
  )

// applications
export const _Fold1 = step => {
  const step_ = (acc, a) =>
    Maybe.Just(
      acc.isJust
      ? step(acc.value, a)
      : a
    )

  return Fold(
    step_,
    Maybe.Nothing(),
    id
  )
}

export const concat = M => Fold(
  (acc, a) => acc.concat(a),
  M.empty,
  id
)

export const head = _Fold1(
  always
)

export const last = _Fold1(
  r.flip(always)
)

export const lastOr = a =>
  Fold(
    r.flip(always),
    a,
    id
  )

export const lastN = n =>
  Fold(
    (acc, x) =>
      r.append(
        x,
        acc.length < n
        ? acc
        : r.drop(1, acc)
      ),
    [],
    id
  )

export const isEmpty =
  Fold(
    (_0, _1) => false,
    true,
    id
  )

export const length = Fold(
  (acc, _) => acc + 1,
  0,
  id
)

export const sum = Fold(
  (acc, c) => acc + c,
  0,
  id
)

export const mean = sum
  .map(div)
  .ap(length)

export const allTrue =
  Fold(
    r.and,
    true,
    id
  )

export const anyTrue =
  Fold(
    r.or,
    false,
    id
  )

export const all = predicate =>
  Fold(
    (acc, cur) => acc && predicate(cur),
    true,
    id
  )

export const any = predicate =>
  Fold(
    (acc, cur) => acc || predicate(cur),
    false,
    id
  )

export const product =
  Fold(
    r.multiply,
    1,
    id
  )

export const sqrSum =
  Fold(
    (acc, cur) => acc + cur * cur,
    0,
    id
  )

export const variance =
  sqrSum
    .map(
      sqrSum => length => mean =>
        sqrSum / length - mean * mean
    )
    .ap(length)
    .ap(mean)

export const std =
  variance.map(Math.sqrt)

export const max =
  _Fold1(Math.max)

export const min =
  _Fold1(Math.min)

export const elem = r.compose(
  any,
  r.equals
)

export const notElem = r.compose(
  all,
  r.complement(r.equals)
)

export const find = a =>
  Fold(
    (acc, cur) =>
      acc.isJust
      ? acc

      : cur === a
      ? Maybe.Just(cur)

      : Maybe.Nothing(),
    Maybe.Nothing(),
    id
  )

export const nth = n =>
  Fold(
    (acc, cur) =>
      Pair(
        acc._1 + 1,
        acc._2.isJust
        ? acc._2

        : n === acc._1
        ? Maybe.Just(cur)

        : Maybe.Nothing()
      ),
    Pair(0, Maybe.Nothing()),
    p => p._2
  )

export const findIndex = predicate =>
  Fold(
    (acc, cur) =>
      acc._2.isJust
      ? acc

      : predicate(cur)
      ? Pair(acc._1, Maybe.Just(cur))

      : Pair(acc._1 + 1, Maybe.Nothing()),
    Pair(0, Maybe.Nothing()),
    p =>
      p._2.isJust
      ? Maybe.Just(p._1)
      : p._2
  )

export const elemIndex = r.compose(
  findIndex,
  r.equals
)

// const Promise = daggy.tagged('Promise', 'a')
// Promise.of = a => Promise(a)
// Promise.prototype.chain = function(f) {
//   return f(this.a)
// }
// Promise.prototype.map = function(f) {
//   return Promise(f(this.a))
// }
// Array.empty = _ => []
// const re = sink(Promise, Array)(a => Promise.of([a + 1, a + 3, a + 5])).reduce([1, 2, 3])
export const sink = (M, W) => act =>
  FoldM(
    (m, a) =>
      act(a)
        .map(m_ =>
          r.concat(m, m_)
        ),
    M.of(W.empty()),
    M.of
  )

export const list = Fold(
  (acc, cur) =>
    r.compose(
      acc,
      r.prepend(cur)
    ),
  id,
  f => f([])
)

export const revList = Fold(
  (acc, cur) =>
    [cur].concat(acc),
  [],
  id
)

export const nub = Fold(
  (acc, cur) =>
    acc._2.has(cur)
    ? acc
    : Pair(
        r.compose(
          acc._1,
          r.prepend(cur)
        ),
        acc._2.add(cur)
      ),
  Pair(id, new Set()),
  p => p._1([])
)

export const set = Fold(
  (acc, cur) =>
    acc.add(cur),
  new Set(),
  id
)

export const premap = f => fold =>
  Fold(
    (acc, cur) => fold.step(acc, f(cur)),
    fold.begin,
    fold.done
  )

export const premapM = f => fold =>
  FoldM(
    (acc, cur) =>
      f(cur)
        .chain(c =>
          fold.step(acc, c)
        ),
    fold.begin,
    fold.done
  )

export const prefilter = predicate => fold =>
  Fold(
    (acc, cur) =>
      predicate(cur)
      ? fold.step(acc, cur)
      : acc,
    fold.begin,
    fold.done
  )

export const prefilterM = predicateM => fold =>
  FoldM(
    (acc, cur) => {
      const useM = predicateM(cur)

      return useM.chain(use =>
        use
        ? fold.step(acc, cur)
        : useM.constructor.of(acc)
      )
    },
    fold.begin,
    fold.done
  )

console.log(std.reduce([1, 2]))