"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.config = undefined;

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _resolve2 = require("resolve");

var _resolve3 = _interopRequireDefault(_resolve2);

var _config = require("./config");

var _helper = require("../helper");

var _options = require("../options");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var resolvers = [function (name) {
    function find(basedir) {
        if (!basedir) {
            return null;
        }

        try {
            return _resolve3.default.sync(name, { basedir: basedir });
        } catch (e) {
            try {
                return _resolve3.default.sync(_path2.default.join(name, "webpack.config.js"), { basedir: basedir });
            } catch (ee) {
                return null;
            }
        }
    }

    var resolved = [find(_options.options.package_path), find(_path2.default.resolve(_path2.default.join(__dirname, "..", "..")))];

    function isDirectory(p) {
        try {
            return _fs2.default.statSync(p).isDirectory();
        } catch (e) {
            return false;
        }
    }

    function isFile(p) {
        try {
            return _fs2.default.statSync(p).isFile();
        } catch (e) {
            return false;
        }
    }

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = resolved[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var r = _step.value;

            if (r) {
                var cfg = require(r);
                if (cfg.default) {
                    return cfg.default;
                } else {
                    return cfg;
                }
            }
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }
}];

function getBase(base) {
    if (typeof base === "string") {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = resolvers[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var _resolve = _step2.value;

                var cfg = _resolve(base);
                if (cfg) {
                    return cfg;
                }
            }
        } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                    _iterator2.return();
                }
            } finally {
                if (_didIteratorError2) {
                    throw _iteratorError2;
                }
            }
        }

        throw new Error("cannot find '" + base + "' config");
    } else {
        return base || {};
    }
}

function factory(isMulti) {
    return function (base, overrides) {
        base = _config.Config.coerce(getBase(base), isMulti);

        var cfg = new _config.Config();
        cfg.update(base);

        if (overrides) {
            cfg.update(overrides);
        }

        return cfg;
    };
}

var config = factory(false);
config.multi = factory(true);

exports.config = config;