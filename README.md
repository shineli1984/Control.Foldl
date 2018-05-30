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

To come up a new fold base on existing folds (in this example calculating averge of an array of numbers), first, write the algorithm in a curried function.
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
TODO