const daggy = require('daggy')
const Maybe = require('data.maybe')
const r = require('ramda')

const Fold = daggy.tagged('Fold', ['step', 'begin', 'done'])
const Pair = daggy.tagged('Pair', ['_1', '_2'])
const div = a => b => a / b
const id = a => a
const always = (a, _) => a

/**
 * as needs to be Foldable
 */
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

// applications
const _Fold1 = step => {
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

const concat = M => Fold(
  (acc, a) => acc.concat(a),
  M.empty,
  id
)

const head = _Fold1(
  always
)

const last = _Fold1(
  r.flip(always)
)

const lastOr = a =>
  Fold(
    r.flip(always),
    a,
    id
  )

const lastN = n =>
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

const isEmpty =
  Fold(
    (_0, _1) => false,
    true,
    id
  )

const length = Fold(
  (acc, _) => acc + 1,
  0,
  id
)

const sum = Fold(
  (acc, c) => acc + c,
  0,
  id
)

const mean = sum
  .map(div)
  .ap(length)

const allTrue =
  Fold(
    r.and,
    true,
    id
  )

const anyTrue =
  Fold(
    r.or,
    false,
    id
  )

const all = predicate =>
  Fold(
    (acc, cur) => acc && predicate(cur),
    true,
    id
  )

const any = predicate =>
  Fold(
    (acc, cur) => acc || predicate(cur),
    false,
    id
  )

const product =
  Fold(
    r.multiply,
    1,
    id
  )

const sqrSum =
  Fold(
    (acc, cur) => acc + cur * cur,
    0,
    id
  )

const variance =
  sqrSum
    .map(
      sqrSum => length => mean =>
        sqrSum / length - mean * mean
    )
    .ap(length)
    .ap(mean)

const std =
  variance.map(Math.sqrt)

const max =
  _Fold1(Math.max)

const min =
  _Fold1(Math.min)

const elem = r.compose(
  any,
  r.equals
)

const notElem = r.compose(
  all,
  r.complement(r.equals)
)

const find = a =>
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

const nth = n =>
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

const findIndex = predicate =>
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

const elemIndex = r.compose(
  findIndex,
  r.equals
)

console.log(elemIndex(5).reduce([2, 3, 3, 5]).toString())

