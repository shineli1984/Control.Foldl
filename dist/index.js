'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var daggy = require('daggy');
var Maybe = require('data.maybe');
var r = require('ramda');

/**
 * Fold a b =
 *   forall x. Fold (x -> a -> x) -> x -> (x -> b)
 *                    step         begin    done
 */
var Fold = exports.Fold = daggy.tagged('Fold', ['step', 'begin', 'done']);

/**
 * FoldM m a b =
 *   forall x. FoldM (x -> a -> m x) -> (m x) -> (x -> m b)
 *                      step            begin       done
 */
var FoldM = exports.FoldM = daggy.tagged('Fold', ['step', 'begin', 'done']);
var Pair = daggy.tagged('Pair', ['_1', '_2']);
var div = function div(a) {
  return function (b) {
    return a / b;
  };
};
var id = function id(a) {
  return a;
};
var always = function always(a, _) {
  return a;
};

Fold.prototype.reduce = function (as) {
  var _this = this;

  var con = function con(a, k) {
    return function (x) {
      return k(_this.step(x, a));
    };
  };

  return r.reduceRight(con, this.done, as)(this.begin);
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
    return r.reduceRight(con, _this3.done, as)(b);
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

// applications
var _Fold1 = exports._Fold1 = function _Fold1(step) {
  var step_ = function step_(acc, a) {
    return Maybe.Just(acc.isJust ? step(acc.value, a) : a);
  };

  return Fold(step_, Maybe.Nothing(), id);
};

var concat = exports.concat = function concat(M) {
  return Fold(function (acc, a) {
    return acc.concat(a);
  }, M.empty, id);
};

var head = exports.head = _Fold1(always);

var last = exports.last = _Fold1(r.flip(always));

var lastOr = exports.lastOr = function lastOr(a) {
  return Fold(r.flip(always), a, id);
};

var lastN = exports.lastN = function lastN(n) {
  return Fold(function (acc, x) {
    return r.append(x, acc.length < n ? acc : r.drop(1, acc));
  }, [], id);
};

var isEmpty = exports.isEmpty = Fold(function (_0, _1) {
  return false;
}, true, id);

var length = exports.length = Fold(function (acc, _) {
  return acc + 1;
}, 0, id);

var sum = exports.sum = Fold(function (acc, c) {
  return acc + c;
}, 0, id);

var mean = exports.mean = sum.map(div).ap(length);

var allTrue = exports.allTrue = Fold(r.and, true, id);

var anyTrue = exports.anyTrue = Fold(r.or, false, id);

var all = exports.all = function all(predicate) {
  return Fold(function (acc, cur) {
    return acc && predicate(cur);
  }, true, id);
};

var any = exports.any = function any(predicate) {
  return Fold(function (acc, cur) {
    return acc || predicate(cur);
  }, false, id);
};

var product = exports.product = Fold(r.multiply, 1, id);

var sqrSum = exports.sqrSum = Fold(function (acc, cur) {
  return acc + cur * cur;
}, 0, id);

var variance = exports.variance = sqrSum.map(function (sqrSum) {
  return function (length) {
    return function (mean) {
      return sqrSum / length - mean * mean;
    };
  };
}).ap(length).ap(mean);

var std = exports.std = variance.map(Math.sqrt);

var max = exports.max = _Fold1(Math.max);

var min = exports.min = _Fold1(Math.min);

var elem = exports.elem = r.compose(any, r.equals);

var notElem = exports.notElem = r.compose(all, r.complement(r.equals));

var find = exports.find = function find(a) {
  return Fold(function (acc, cur) {
    return acc.isJust ? acc : cur === a ? Maybe.Just(cur) : Maybe.Nothing();
  }, Maybe.Nothing(), id);
};

var nth = exports.nth = function nth(n) {
  return Fold(function (acc, cur) {
    return Pair(acc._1 + 1, acc._2.isJust ? acc._2 : n === acc._1 ? Maybe.Just(cur) : Maybe.Nothing());
  }, Pair(0, Maybe.Nothing()), function (p) {
    return p._2;
  });
};

var findIndex = exports.findIndex = function findIndex(predicate) {
  return Fold(function (acc, cur) {
    return acc._2.isJust ? acc : predicate(cur) ? Pair(acc._1, Maybe.Just(cur)) : Pair(acc._1 + 1, Maybe.Nothing());
  }, Pair(0, Maybe.Nothing()), function (p) {
    return p._2.isJust ? Maybe.Just(p._1) : p._2;
  });
};

var elemIndex = exports.elemIndex = r.compose(findIndex, r.equals);

var sink = exports.sink = function sink(Monad, Monoid) {
  return function (act) {
    return FoldM(function (m, a) {
      return act(a).map(function (m_) {
        return r.concat(m, m_);
      });
    }, Monad.of(Monoid.empty()), Monad.of);
  };
};

var list = exports.list = Fold(function (acc, cur) {
  return r.compose(acc, r.prepend(cur));
}, id, function (f) {
  return f([]);
});

var revList = exports.revList = Fold(function (acc, cur) {
  return [cur].concat(acc);
}, [], id);

var nub = exports.nub = Fold(function (acc, cur) {
  return acc._2.has(cur) ? acc : Pair(r.compose(acc._1, r.prepend(cur)), acc._2.add(cur));
}, Pair(id, new Set()), function (p) {
  return p._1([]);
});

var set = exports.set = Fold(function (acc, cur) {
  return acc.add(cur);
}, new Set(), id);

var premap = exports.premap = function premap(f) {
  return function (fold) {
    return Fold(function (acc, cur) {
      return fold.step(acc, f(cur));
    }, fold.begin, fold.done);
  };
};

var premapM = exports.premapM = function premapM(f) {
  return function (fold) {
    return FoldM(function (acc, cur) {
      return f(cur).chain(function (c) {
        return fold.step(acc, c);
      });
    }, fold.begin, fold.done);
  };
};

var prefilter = exports.prefilter = function prefilter(predicate) {
  return function (fold) {
    return Fold(function (acc, cur) {
      return predicate(cur) ? fold.step(acc, cur) : acc;
    }, fold.begin, fold.done);
  };
};

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

var AMonad = daggy.tagged('AMonad', 'a');
AMonad.of = function (a) {
  return AMonad(a);
};
AMonad.prototype.chain = function (f) {
  return f(this.a);
};
AMonad.prototype.map = function (f) {
  return AMonad(f(this.a));
};

// make array a fantasy-land compatible Monoid
Array.empty = function (_) {
  return [];
};

var g = generalize(AMonad);

var sumM = g(sum);

var lengthM = g(length);
var avg = function avg(sum) {
  return function (length) {
    return sum / length;
  };
};

console.log(sumM.map(avg).ap(lengthM).reduce([9, 2, 4]));

// const re = sink(AMonad, Array)(a => AMonad.of([a + 1, a + 3, a + 5])).reduce([1, 2, 3])
// console.log(re)