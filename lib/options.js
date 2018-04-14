"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.options = exports.Options = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DATA = Symbol("DATA");
var ENV_VARS = ["cwd", "package_path", "isServing", "isHot"];

var Options = exports.Options = function () {
    function Options() {
        var _this = this;

        _classCallCheck(this, Options);

        Object.defineProperty(this, DATA, {
            enumerable: false,
            writable: false,
            configurable: false,
            value: {}
        });

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = ENV_VARS[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var k = _step.value;

                var v = process.env["anzar_" + k];
                if (v === "true") {
                    v = true;
                } else if (v === "false") {
                    v = false;
                }
                this.set(k, v);
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

        console.log(this.data);

        var _package_json = null;
        this.set("package", function () {
            if (_package_json === null) {
                _package_json = JSON.parse(_fs2.default.readSync(_path2.default.join(_this.package_path, "package.json")));
            }
            return _package_json;
        });

        this.set("___", Math.round(Math.random() * 1000));
    }

    _createClass(Options, [{
        key: "set",
        value: function set(key, value) {
            this[DATA][key] = value;

            if (!this.hasOwnProperty(key)) {
                Object.defineProperty(this, key, {
                    enumerable: true,
                    configurable: false,
                    get: this.get.bind(this, key, null)
                });
            }

            return this;
        }
    }, {
        key: "setDefault",
        value: function setDefault(key, value) {
            if (!this[DATA].hasOwnProperty(key)) {
                this.set(key, value);
            }
        }
    }, {
        key: "setAll",
        value: function setAll(data) {
            for (var k in data) {
                this.set(k, data[k]);
            }
        }
    }, {
        key: "setAllDefault",
        value: function setAllDefault(data) {
            for (var k in data) {
                this.setDefault(k, data[k]);
            }
        }
    }, {
        key: "get",
        value: function get(key, defaultValue) {
            var val = this[DATA][key];
            if (typeof val === "function") {
                return val(this);
            } else if (val == null) {
                return defaultValue == null ? null : defaultValue;
            } else {
                return val;
            }
        }
    }, {
        key: "each",
        value: function each(cb) {
            for (var k in this[DATA]) {
                cb(k, this.get(k));
            }
        }
    }, {
        key: "merge",
        value: function merge(other) {
            for (var k in other[DATA]) {
                this[DATA][k] = other[DATA][k];
            }
            return this;
        }
    }, {
        key: "substitute",


        /**
         * Replace all occurance of `[...]` with the registered value.
         * If value is not set, replacement is not performed.
         */
        value: function substitute(templateString) {
            var _this2 = this;

            return ("" + templateString).replace(/\[([^\]]+)\]/g, function (match, key) {
                var parts = key.split(/\./);
                var base = _this2.get(parts.shift(), math);
                if (base === match) {
                    return match;
                }

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = parts[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var p = _step2.value;

                        base = base[p];
                        if (!base) {
                            return match;
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

                return base;
            });
        }
    }, {
        key: "data",
        get: function get() {
            var data = {};
            this.each(function (k, v) {
                data[k] = v;
            });
            return data;
        }
    }]);

    return Options;
}();

var options = new Options();
exports.options = options;