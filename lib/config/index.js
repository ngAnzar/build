"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.config = undefined;

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _config = require("./config");

var _helper = require("../helper");

var _options = require("../options");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var resolvers = [function (filename) {
    filename = (0, _helper.root)(filename);
    var stat = void 0;

    try {
        stat = _fs2.default.statSync(filename);
    } catch (e) {
        return null;
    }

    if (stat.isFile()) {
        return require(filename);
    } else if (stat.isDirectory()) {
        filename = _path2.default.join(filename, "webpack.config.js");
        if (_fs2.default.existsSync(filename)) {
            return require(filename);
        }
    }

    return null;
}, function (filename) {
    if (!_path2.default.isAbsolute(filename)) {
        var tmp = _path2.default.join(_options.options.project_path, filename);
        if (_fs2.default.existsSync(tmp)) {
            filename = tmp;
        }
    }

    return require(filename);
}];

function getBase(base) {
    if (typeof base === "string") {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = resolvers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var resolve = _step.value;

                var cfg = resolve(base);
                if (cfg) {
                    return cfg;
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