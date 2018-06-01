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

var Fold = exports.Fold = _daggy2.default.tagged('Fold', ['step', 'begin', 'done']);

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

Fold.prototype.map = function (f) {
  var _this2 = this;

  return Fold(this.step, this.begin, function (a) {
    return f(_this2.done(a));
  });
};

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

FoldM.prototype.map = function (f) {
  var _this4 = this;

  return FoldM(this.step, this.begin, function (x) {
    return _this4.done(x).map(f);
  });
};

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

var _Fold1 = exports._Fold1 = function _Fold1(step) {
  var step_ = function step_(acc, a) {
    return _data2.default.Just(acc.isJust ? step(acc.value, a) : a);
  };

  return Fold(step_, _data2.default.Nothing(), id);
};

var concat = exports.concat = function concat(Monoid) {
  return Fold(function (acc, a) {
    return acc.concat(a);
  }, Monoid.empty(), id);
};

var head = exports.head = _Fold1(always);

var last = exports.last = _Fold1(flip(always));

var lastOr = exports.lastOr = function lastOr(a) {
  return Fold(flip(always), a, id);
};

var lastN = exports.lastN = function lastN(n) {
  return Fold(function (acc, x) {
    return append(x, acc.length < n ? acc : drop(1, acc));
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

var allTrue = exports.allTrue = Fold(and, true, id);

var anyTrue = exports.anyTrue = Fold(or, false, id);

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

var product = exports.product = Fold(multiply, 1, id);

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

var elem = exports.elem = compose(any, equals);

var notElem = exports.notElem = compose(all, notEqual);

var find = exports.find = function find(a) {
  return Fold(function (acc, cur) {
    return acc.isJust ? acc : cur === a ? _data2.default.Just(cur) : _data2.default.Nothing();
  }, _data2.default.Nothing(), id);
};

var nth = exports.nth = function nth(n) {
  return Fold(function (acc, cur) {
    return Pair(acc._1 + 1, acc._2.isJust ? acc._2 : n === acc._1 ? _data2.default.Just(cur) : _data2.default.Nothing());
  }, Pair(0, _data2.default.Nothing()), function (p) {
    return p._2;
  });
};

var findIndex = exports.findIndex = function findIndex(predicate) {
  return Fold(function (acc, cur) {
    return acc._2.isJust ? acc : predicate(cur) ? Pair(acc._1, _data2.default.Just(cur)) : Pair(acc._1 + 1, _data2.default.Nothing());
  }, Pair(0, _data2.default.Nothing()), function (p) {
    return p._2.isJust ? _data2.default.Just(p._1) : p._2;
  });
};

var elemIndex = exports.elemIndex = compose(findIndex, equals);

var sink = exports.sink = function sink(Monad, Monoid) {
  return function (act) {
    return FoldM(function (m, a) {
      return act(a).map(function (m_) {
        return m.concat(m_);
      });
    }, Monad.of(Monoid.empty()), Monad.of);
  };
};

var list = exports.list = Fold(function (acc, cur) {
  return compose(acc, prepend(cur));
}, id, function (f) {
  return f([]);
});

var revList = exports.revList = Fold(function (acc, cur) {
  return [cur].concat(acc);
}, [], id);

var nub = exports.nub = Fold(function (acc, cur) {
  return acc._2.has(cur) ? acc : Pair(compose(acc._1, prepend(cur)), acc._2.add(cur));
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