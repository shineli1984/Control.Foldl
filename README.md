# What
This package provides efficient left folds in applictive styles.

# Why
It's very easy to write inefficient folds when multiple foldings are needed.

e.g. when calculating standard deviation a naive implementation could be:
```js
const varianceFormular = sqrSum => length => mean =>
  Math.sqrt(sqrSum / length - mean * mean)

const sqrSum = arr.reduce((acc, cur) => cur * cur + acc, 0)
const length = arr.reduce((acc, _) => acc + 1, 0)
const mean = arr.reduce((a, b) => a + b, 0) / length
const std = varianceFormular(sqrSum)(length)(mean)
```
The code above loop through the array every time reduce is called. Whereas, using this package like below only one looping is needed.
```js
import {sqrSum, length, mean} from 'control.foldl'

const std =
  sqrSum
    .map(varianceFormular)
    .ap(length)
    .ap(mean)

const result = std.reduce([1, 2]) // 0.5
```