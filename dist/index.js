'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prefilterM = exports.prefilter = exports.premapM = exports.premap = exports.set = exports.nub = exports.revList = exports.list = exports.sink = exports.elemIndex = exports.findIndex = exports.nth = exports.find = exports.notElem = exports.elem = exports.min = exports.max = exports.std = exports.variance = exports.sqrSum = exports.product = exports.any = exports.all = exports.anyTrue = exports.allTrue = exports.mean = exports.sum = exports.length = exports.isEmpty = exports.lastN = exports.lastOr = exports.last = exports.head = exports.concat = exports._Fold1 = exports.generalize = exports.FoldM = exports.Fold = undefined;

var _daggy = require('daggy');

var _daggy2 = _interopRequireDefault(_daggy);

var _data = require('data.maybe');

var _data2 = _interopRequireDefault(_data);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * Fold a b =
 *   forall x. Fold (x -> a -> x) -> x -> (x -> b)
 *                    step         begin    done
 */
var Fold = exports.Fold = _daggy2.default.tagged('Fold', ['step', 'begin', 'done']);

/**
 * FoldM m a b =
 *   forall x. FoldM (x -> a -> m x) -> (m x) -> (x -> m b)
 *                      step            begin       done
 */
var FoldM = exports.FoldM = _daggy2.default.tagged('Fold', ['step', 'begin', 'done']);

var Pair = _daggy2.default.tagged('Pair', ['_1', '_2']);
var div = function div(a) {
  return function (b) {
    return a / b;
  };
};
var append = function append(a, arr) {
  return [].concat(_toConsumableArray(arr), [a]);
};
var id = function id(a) {
  return a;
};
var always = function always(a, _) {
  return a;
};
var flip = function flip(f) {
  return function (a, b) {
    return f(b, a);
  };
};
var foldr = function foldr(reducer, acc, foldable) {
  if (foldable.constructor !== Array && foldable.reduceRight) {
    return foldable.reduceRight(reducer, acc);
  }

  var idx = foldable.length - 1;
  while (idx >= 0) {
    acc = reducer(foldable[idx], acc);
    idx -= 1;
  }
  return acc;
};
var drop = function drop(n, xs) {
  return xs.slice(Math.max(0, n), Infinity);
};
var and = function and(a, b) {
  return a && b;
};
var or = function or(a, b) {
  return a || b;
};
var multiply = function multiply(a, b) {
  return a * b;
};
var compose = function compose() {
  for (var _len = arguments.length, fs = Array(_len), _key = 0; _key < _len; _key++) {
    fs[_key] = arguments[_key];
  }

  return fs.reduce(function (acc, cur, index) {
    return index === 0 ? function () {
      return acc(cur.apply(undefined, arguments));
    } : function (a) {
      return acc(cur(a));
    };
  }, id);
};
var equals = function equals(a) {
  return function (b) {
    return a === b;
  };
};
var not = function not(a) {
  return !a;
};
var notEqual = function notEqual(a) {
  return function (b) {
    return compose(not, equals(a))(b);
  };
};
var prepend = function prepend(a) {
  return function (as) {
    return [a].concat(_toConsumableArray(as));
  };
};

Fold.prototype.reduce = function (as) {
  var _this = this;

  var con = function con(cur, acc) {
    return function (x) {
      return acc(_this.step(x, cur));
    };
  };

  return foldr(con, this.done, as)(this.begin);
};

// Functor
Fold.prototype.map = function (f) {
  var _this2 = this;

  return Fold(this.step, this.begin, function (a) {
    return f(_this2.done(a));
  });
};

// Applicative
Fold.prototype.of = function (b) {
  return Fold(function (_) {
    return function (_) {
      return null;
    };
  }, null, function (_) {
    return b;
  });
};

Fold.prototype.ap = function (right) {
  var left = this;

  var step = function step(p, a) {
    return Pair(left.step(p._1, a), right.step(p._2, a));
  };

  var begin = Pair(left.begin, right.begin);

  var done = function done(p) {
    return left.done(p._1)(right.done(p._2));
  };

  return Fold(step, begin, done);
};

FoldM.prototype.reduce = function (as) {
  var _this3 = this;

  var con = function con(a, k) {
    return function (x) {
      return _this3.step(x, a).chain(k);
    };
  };

  return this.begin.chain(function (b) {
    return foldr(con, _this3.done, as)(b);
  });
};

// Functor
FoldM.prototype.map = function (f) {
  var _this4 = this;

  return FoldM(this.step, this.begin, function (x) {
    return _this4.done(x).map(f);
  });
};

// Applicative
FoldM.prototype.ap = function (right) {
  var left = this;
  return FoldM(function (p, a) {
    return left.step(p._1, a).chain(function (_1) {
      return right.step(p._2, a).map(function (_2) {
        return Pair(_1, _2);
      });
    });
  }, left.begin.chain(function (l) {
    return right.begin.map(function (r) {
      return Pair(l, r);
    });
  }), function (x) {
    return left.done(x._1).chain(function (f) {
      return right.done(x._2).chain(function (v) {
        return f(v);
      });
    });
  });
};

/**
 * generalize :: Monad m -> Fold a b -> FoldM m a b
 */
var generalize = exports.generalize = function generalize(Monad) {
  return function (_ref) {
    var step = _ref.step,
        begin = _ref.begin,
        done = _ref.done;
    return FoldM(function (acc, cur) {
      return Monad.of(step(acc, cur));
    }, Monad.of(begin), function (x) {
      return Monad.of(done(x));
    });
  };
};

/**
 * Take a step with same type for accumulated value and current value and
 * produce a Fold with a step having accumulated value wrapped inside Maybe.
 *
 * _Fold1 :: ((a, a) -> a) -> Fold a (Maybe a)
 */
var _Fold1 = exports._Fold1 = function _Fold1(step) {
  var step_ = function step_(acc, a) {
    return _data2.default.Just(acc.isJust ? step(acc.value, a) : a);
  };

  return Fold(step_, _data2.default.Nothing(), id);
};

/**
 * concat :: Monoid a -> Fold a a
 * Fold monoid(s) inside a Foldable using its concat and empty methods.
 */
var concat = exports.concat = function concat(Monoid) {
  return Fold(function (acc, a) {
    return acc.concat(a);
  }, Monoid.empty(), id);
};

/**
 * head :: Fold a (Maybe a)
 * Get the first element of a Foldable. If the Foldable is empty, the fold will return Nothing.
 */
var head = exports.head = _Fold1(always);

/**
 * last :: Fold a (Maybe a)
 * Get the last element of a Foldable. If the Foldable is empty, the fold will return Nothing.
 */
var last = exports.last = _Fold1(flip(always));

/**
 * lastOr :: a -> Fold a a
 * Get the last element of a Foldable with a default value if there is no last element.
 */
var lastOr = exports.lastOr = function lastOr(a) {
  return Fold(flip(always), a, id);
};

/**
 * lastN :: Integer -> Fold a [a]
 * Get the last N elements of a Foldable structure
 */
var lastN = exports.lastN = function lastN(n) {
  return Fold(function (acc, x) {
    return append(x, acc.length < n ? acc : drop(1, acc));
  }, [], id);
};

/**
 * isEmpty :: Fold a Boolean
 * Check if a Foldable is empty
 */
var isEmpty = exports.isEmpty = Fold(function (_0, _1) {
  return false;
}, true, id);

/**
 * length :: Fold a Integer
 * Get the length of a Foldable
 */
var length = exports.length = Fold(function (acc, _) {
  return acc + 1;
}, 0, id);

/**
 * sum :: Number a => Fold a a
 * Get the sum of elements in a Foldable
 */
var sum = exports.sum = Fold(function (acc, c) {
  return acc + c;
}, 0, id);

/**
 * mean :: Number a  => Fold a a
 * Get the mean (average) of elements in a Foldable
 */
var mean = exports.mean = sum.map(div).ap(length);

/**
 * allTrue :: Fold a Boolean
 * Check if all elements in a foldable are true-sy
 */
var allTrue = exports.allTrue = Fold(and, true, id);

/**
 * anyTrue :: Fold a Boolean
 * Check if there is at least one element in a foldable is true-sy
 */
var anyTrue = exports.anyTrue = Fold(or, false, id);

/**
 * all :: (a -> Boolean) -> Fold a Boolean
 * Check if all element in a foldable satisfy a predicate
 */
var all = exports.all = function all(predicate) {
  return Fold(function (acc, cur) {
    return acc && predicate(cur);
  }, true, id);
};

/**
 * any :: (a -> Boolean) -> Fold a Boolean
 * Check if there is at least one element in a foldable satisfy a predicate
 */
var any = exports.any = function any(predicate) {
  return Fold(function (acc, cur) {
    return acc || predicate(cur);
  }, false, id);
};

/**
 * product :: Number a => Fold a a
 * Multiply all numbers
 */
var product = exports.product = Fold(multiply, 1, id);

/**
 * sqrSum :: Number a => Fold a a
 * Calculate the square sum
 */
var sqrSum = exports.sqrSum = Fold(function (acc, cur) {
  return acc + cur * cur;
}, 0, id);

/**
 * variance :: Number a => Fold a a
 * Calculate variance
 */
var variance = exports.variance = sqrSum.map(function (sqrSum) {
  return function (length) {
    return function (mean) {
      return sqrSum / length - mean * mean;
    };
  };
}).ap(length).ap(mean);

/**
 * std :: Number a => Fold a a
 * Calculate standard deviation
 */
var std = exports.std = variance.map(Math.sqrt);

/**
 * max :: Number a => Fold a a
 * Get the maximum number
 */
var max = exports.max = _Fold1(Math.max);

/**
 * min :: Number a => Fold a a
 * Get the minimal number
 */
var min = exports.min = _Fold1(Math.min);

/**
 * elem :: a -> Fold a Boolean
 * Check if an element is in the foldable
 */
var elem = exports.elem = compose(any, equals);

/**
 * notElem :: a -> Fold a Boolean
 * Check if an element is NOT in the foldable
 */
var notElem = exports.notElem = compose(all, notEqual);

/**
 * find :: a -> Fold a Maybe a
 * Find an element and return it wrapped in a Just or Nothing
 */
var find = exports.find = function find(a) {
  return Fold(function (acc, cur) {
    return acc.isJust ? acc : cur === a ? _data2.default.Just(cur) : _data2.default.Nothing();
  }, _data2.default.Nothing(), id);
};

/**
 * nth :: Integer -> Fold a a
 * Get the nth element wrapped in a Just or Nothing
 */
var nth = exports.nth = function nth(n) {
  return Fold(function (acc, cur) {
    return Pair(acc._1 + 1, acc._2.isJust ? acc._2 : n === acc._1 ? _data2.default.Just(cur) : _data2.default.Nothing());
  }, Pair(0, _data2.default.Nothing()), function (p) {
    return p._2;
  });
};

/**
 * findIndex :: (a -> Boolean) -> Fold a Maybe(Integer)
 * Find a index according to a predicate wrapped in a Just or Nothing
 */
var findIndex = exports.findIndex = function findIndex(predicate) {
  return Fold(function (acc, cur) {
    return acc._2.isJust ? acc : predicate(cur) ? Pair(acc._1, _data2.default.Just(cur)) : Pair(acc._1 + 1, _data2.default.Nothing());
  }, Pair(0, _data2.default.Nothing()), function (p) {
    return p._2.isJust ? _data2.default.Just(p._1) : p._2;
  });
};

/**
 * elemIndex :: a -> Fold a Integer
 * Find the index of an element wrapped in Just or Nothing
 */
var elemIndex = exports.elemIndex = compose(findIndex, equals);

/**
 * sink :: (Monad m, Monoid w) -> (a -> m w) -> FoldM m a w
 * Convert a function producing effects to a Foldable.
 * Then concat the result of the effects for each element when reduced.
 */
var sink = exports.sink = function sink(Monad, Monoid) {
  return function (act) {
    return FoldM(function (m, a) {
      return act(a).map(function (m_) {
        return m.concat(m_);
      });
    }, Monad.of(Monoid.empty()), Monad.of);
  };
};

/**
 * list :: Fold a [a]
 * Fold all elements to a list
 */
var list = exports.list = Fold(function (acc, cur) {
  return compose(acc, prepend(cur));
}, id, function (f) {
  return f([]);
});

/**
 * revList :: Fold a [a]
 * Reverse a list
 */
var revList = exports.revList = Fold(function (acc, cur) {
  return [cur].concat(acc);
}, [], id);

/**
 * num :: Ord a => Fold a [a]
 * Remove remaining duplicates of each element and produce a list containing unique elements.
 */
var nub = exports.nub = Fold(function (acc, cur) {
  return acc._2.has(cur) ? acc : Pair(compose(acc._1, prepend(cur)), acc._2.add(cur));
}, Pair(id, new Set()), function (p) {
  return p._1([]);
});

/**
 * set :: Fold a (Set a)
 * Fold to Set
 */
var set = exports.set = Fold(function (acc, cur) {
  return acc.add(cur);
}, new Set(), id);

/**
 * premap :: (a -> b) -> Fold a r -> Fold b r
 * Get a Fold that run f before each step.
 * This is essentially the same as in mapping then folding.
 * But this is more efficient in most cases.
 */
var premap = exports.premap = function premap(f) {
  return function (fold) {
    return Fold(function (acc, cur) {
      return fold.step(acc, f(cur));
    }, fold.begin, fold.done);
  };
};

/**
 * premapM :: (a -> m b) -> FoldM m a r -> FoldM m b r
 * The monadic version of the premap.
 */
var premapM = exports.premapM = function premapM(f) {
  return function (fold) {
    return FoldM(function (acc, cur) {
      return f(cur).chain(function (c) {
        return fold.step(acc, c);
      });
    }, fold.begin, fold.done);
  };
};

/**
 * prefilter :: (a -> Boolean) -> Fold a r -> Fold a r
 * Get a Fold that run a predicate on the current value before each step to
 * determine the result should include the current step or not.
 */
var prefilter = exports.prefilter = function prefilter(predicate) {
  return function (fold) {
    return Fold(function (acc, cur) {
      return predicate(cur) ? fold.step(acc, cur) : acc;
    }, fold.begin, fold.done);
  };
};

/**
 * prefilterM :: (a -> m Boolean) -> Fold m a r -> Fold m a r
 * The monadic version of prefilter
 */
var prefilterM = exports.prefilterM = function prefilterM(predicateM) {
  return function (fold) {
    return FoldM(function (acc, cur) {
      var useM = predicateM(cur);

      return useM.chain(function (use) {
        return use ? fold.step(acc, cur) : useM.constructor.of(acc);
      });
    }, fold.begin, fold.done);
  };
};