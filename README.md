# What
This is a port of the Haskell Control.Foldl package.

This package provides efficient left folds in applictive styles.

[fantasy-land](https://github.com/fantasyland/fantasy-land) compatible.

e.g. For calculating standard deviation using the formular below.
```js
const varianceFormular = sqrSum => length => mean =>
  Math.sqrt(sqrSum / length - mean * mean)
```
We can fold an array using this package's utility functions.
```js
import {sqrSum, length, mean} from 'control.foldl'

// generate a fold
const std =
  sqrSum
    .map(varianceFormular)
    .ap(length)
    .ap(mean)

const arr = [1, 2]

// actually run the fold by calling reduce
const result = std.reduce(arr) // 0.5
```

# Why
It's very easy to write inefficient folds when multiple foldings are needed.

e.g. here is a naive implementation of calculating standard deviation:
```js
const arr = [1, 2]

const sqrSum = arr.reduce((acc, cur) => cur * cur + acc, 0)

const length = arr.reduce((acc, _) => acc + 1, 0)

const mean = arr.reduce((a, b) => a + b, 0) / length

const std = varianceFormular(sqrSum)(length)(mean)
```
The code above loop through the array every time reduce is called.
Whereas, the example in the first section only loops once.

It's also very easy to write efficient folds but not generic enough.
e.g.
```js
const [sqrSum, length, sum] = arr.reduce(
  (acc, cur) =>
    // calculating every step of square sum, sum and length at the same place
    [
      acc[0] + cur * cur, // square sum
      acc + 1, // length
      acc + cur // sum
    ]
  [0, 0, 0],
)([1, 2])

const std = varianceFormular(sqrSum)(length)(sum / length)
```
The above code increase effeciency as in calculating every step of square sum, sum and length at the same place.
Accordingly, it combines the starting values for each operation (square sum, sum and length) inside an array as the initial value to the reduce function.
This approach can be easilly adopted for combining any number of foldings. This package is to provide abstraction over this approach and utility funcitons for various foldings for your needs.

# How
## Compose existing folds

To come up a new fold base on existing folds (in this example calculating average of an array of numbers), first, write the algorithm in a curried function.
```js
// instead of (sum, length) => ...
const avgAlgorithm = sum => length =>
  sum / length
```
Second, use `map` and `ap` to generate a fold
```js
import {sum, length} from 'control.foldl'
const avg =
  sum // since avgAlgorithm take the sum of array first, we put sum here first
    .map(avgAlgorithm) // we use map to 'embed' avgAlgorithm into fold.
    .ap(length) // we use `ap` to bring the length of the array to the second argument of avgAlgorithm
// the above does not actually doing any folding but instead constructing the folding like the example under `Why` section to be triggered.
```
Thirdly, run the fold using `reduce`.
```js
avg.reduce([1, 2]) // 0.5
```
## Write your own folds
If none of the build-in utils satisfy your needs, you can always write your own (PR welcome):
```js
import {Fold} from 'control.foldl'
const halfSum = Fold(
  (acc, cur) => acc + cur, // the reducer function, just like the one you pass to Array.prototype.reduce but with only the first 2 arguments (no index as the 3rd argument)
  0, // the initial value
  sum => sum / 2 // this is the function runs after folding finishes. It receives the last accumulated value as input. The output will be the output when run the `reduce` method on `halfSum`.
)

halfSum.reduce([1, 3]) // 2
```
## Pre-operations
Map before fold is a very common need. But a separate map from fold is not efficient. This package provides preMap for this.
```js
import {premapM, sum} from 'control.foldl'
const sqr = a => a * a 
const sqrSum = premapM(sqr)(sum)
// [1, 2] will only be looped once
sqrSum.reduce([1, 2]) // 5
```
Similarly, there is a prefilter to combine a filter operation with fold efficiently.
```js
import {prefilter, sum} from 'control.foldl'
const sumOver2 = prefilter(a => a > 2)(sum)
// [1, 2, 3, 4] will only be looped once for summing and filtering at the same time
sumOver2.reduce([1, 2, 3, 4]) // 7
```
  
## The Functor instance
The above example can be written like this:
```js
import {sum} from 'control.foldl'
const halfSum = sum.map(a => a / 2)

halfSum.reduce([1, 3]) // 2
```
This is because any fold (the `sum` imported in this case) is a functor, it maps the last param passed to `Fold` when constrcted (in `sum`, it is `id`). And `id` as a function is a functor itself as well. So maping on it is the same as `compose` a function on to id.

## The monadic(generalized) version
This package also provide a monadic version of the `Fold` called `FoldM`.
```js
import daggy from 'daggy'

// create a Monad called AMonad
const AMonad = daggy.tagged('AMonad', 'a')
AMonad.of = a => AMonad(a)
AMonad.prototype.chain = function(f) {
  return f(this.a)
}
AMonad.prototype.map = function(f) {
  return AMonad(f(this.a))
}

// make array a fantasy-land compatible Monoid
Array.empty = _ => []

// this is in the source code:
const sink = (Monad, Monoid) => act =>
  FoldM(
    (m, a) => // the reducer function now needs to return values inside monadic context
      act(a)
        .map(m_ =>
          r.concat(m, m_)
        ),
    Monad.of(Monoid.empty()),
    Monad.of
  )

const result = sink(AMonad, Array)(
  a => AMonad.of([a + 1, a + 3, a + 5])
).reduce([1, 2, 3])

result.toString() // AMonad([2, 4, 6, 3, 5, 7, 4, 6, 8])
```
There are also monadic versions for premap and prefilter

## Convert to monadic version
Sometime, you need to use the build-in non-monadic util together with `FoldM`. Then you need to convert them.
```js
import {generalize, sum} from 'control.foldl'

const sumM = generalize(
  SomeMonad // this needs to be a fantasy-land compatible monad
)(sum)

sumM.reduce([1, 2, 3]) // SomeMonad(6)
```
You can use `map` and `ap` just like before
```js
import {generalize} from 'control.foldl'
const g = generalize(AMonad)

const sumM = g(sum)
const lengthM = g(length)

const avg = sum => length => sum / length

sumM
  .map(avg)
  .ap(lengthM)
  .reduce([9, 2, 4]) // AMonad(5)

```

# API documentation
Type signaure, description and examples are in [source](https://github.com/shineli1984/Control.Foldl/blob/master/src/index.js).