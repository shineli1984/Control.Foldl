import daggy from 'daggy'
import Maybe from 'data.maybe'
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
const append = (a, arr) => [...arr, a]
const id = a => a
const always = (a, _) => a
const flip = f => (a, b) => f(b, a)
const foldr = (reducer, acc, foldable) => {
  if (foldable.constructor !== Array && foldable.reduceRight) {
    return foldable.reduceRight(reducer, acc)
  }

  var idx = foldable.length - 1;
  while (idx >= 0) {
    acc = reducer(foldable[idx], acc);
    idx -= 1;
  }
  return acc;
}
const drop = (n, xs) =>
  xs.slice(Math.max(0, n), Infinity)
const and = (a, b) => a && b
const or = (a, b) => a || b
const multiply = (a, b) => a * b
const compose = (...fs) =>
  fs.reduce(
    (acc, cur, index) =>
      index === 0
      ? (...a) => acc(cur(...a))
      : a => acc(cur(a))
    ,
    id
  )
const equals = a => b => a === b
const not = a => !a
const notEqual = a => b => compose(
  not,
  equals(a)
)(b)
const prepend = a => as => [a, ...as]

Fold.prototype.reduce = function(as) {
  const con = (cur, acc) => x =>
    acc(this.step(x, cur))

  return foldr(con, this.done, as)(this.begin)
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
    b => foldr(con, this.done, as)(b)
  )
}

// Functor
FoldM.prototype.map = function(f) {
  return FoldM(
    this.step,
    this.begin,
    x => this.done(x).map(f)
  )
}

// Applicative
FoldM.prototype.ap = function(right) {
  const left = this
  return FoldM(
    (p, a) =>
      left
        .step(p._1, a)
        .chain(_1 =>
          right
            .step(p._2, a)
            .map(_2 =>
              Pair(_1, _2)
            )
        ),
    left.begin.chain(l =>
      right.begin.map(r =>
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

/**
 * generalize :: Monad m -> Fold a b -> FoldM m a b
 */
export const generalize = Monad => ({step, begin, done}) =>
  FoldM(
    (acc, cur) => Monad.of(step(acc, cur)),
    Monad.of(begin),
    x => Monad.of(done(x))
  )

/**
 * Take a step with same type for accumulated value and current value and
 * produce a Fold with a step having accumulated value wrapped inside Maybe.
 *
 * _Fold1 :: ((a, a) -> a) -> Fold a (Maybe a)
 */
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

/**
 * concat :: Monoid a -> Fold a a
 * Fold monoid(s) inside a Foldable using its concat and empty methods.
 */
export const concat = Monoid => Fold(
  (acc, a) => acc.concat(a),
  Monoid.empty(),
  id
)

/**
 * head :: Fold a (Maybe a)
 * Get the first element of a Foldable. If the Foldable is empty, the fold will return Nothing.
 */
export const head = _Fold1(
  always
)

/**
 * last :: Fold a (Maybe a)
 * Get the last element of a Foldable. If the Foldable is empty, the fold will return Nothing.
 */
export const last = _Fold1(
  flip(always)
)

/**
 * lastOr :: a -> Fold a a
 * Get the last element of a Foldable with a default value if there is no last element.
 */
export const lastOr = a =>
  Fold(
    flip(always),
    a,
    id
  )

export const lastN = n =>
  Fold(
    (acc, x) =>
      append(
        x,
        acc.length < n
        ? acc
        : drop(1, acc)
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
    and,
    true,
    id
  )

export const anyTrue =
  Fold(
    or,
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
    multiply,
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

export const elem = compose(
  any,
  equals
)

export const notElem = compose(
  all,
  notEqual
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

export const elemIndex = compose(
  findIndex,
  equals
)

export const sink = (Monad, Monoid) => act =>
  FoldM(
    (m, a) =>
      act(a)
        .map(m_ =>
          m.concat(m_)
        ),
    Monad.of(Monoid.empty()),
    Monad.of
  )

export const list = Fold(
  (acc, cur) =>
    compose(
      acc,
      prepend(cur)
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
        compose(
          acc._1,
          prepend(cur)
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
