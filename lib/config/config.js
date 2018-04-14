"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Config = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _webpack = require("webpack");

var _webpack2 = _interopRequireDefault(_webpack);

var _webpackMerge = require("webpack-merge");

var _webpackMerge2 = _interopRequireDefault(_webpackMerge);

var _lodash = require("lodash");

var _options = require("../options");

var _defines = require("../defines");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _extendableBuiltin(cls) {
    function ExtendableBuiltin() {
        var instance = Reflect.construct(cls, Array.from(arguments));
        Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
        return instance;
    }

    ExtendableBuiltin.prototype = Object.create(cls.prototype, {
        constructor: {
            value: cls,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });

    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(ExtendableBuiltin, cls);
    } else {
        ExtendableBuiltin.__proto__ = cls;
    }

    return ExtendableBuiltin;
}

function substOptions(cfg) {
    for (var k in cfg) {
        var v = cfg[k];
        if ((0, _lodash.isPlainObject)(v)) {
            substOptions(v);
        } else if (typeof v === "string") {
            cfg[k] = _options.options.substitute(v);
        }
    }
}

var Config = exports.Config = function (_extendableBuiltin2) {
    _inherits(Config, _extendableBuiltin2);

    _createClass(Config, null, [{
        key: "coerce",
        value: function coerce(config, isMulti) {
            if (config instanceof Config) {
                if (!isMulti || config.isMulti === isMulti) {
                    return config;
                } else {
                    throw new Error("Cannot convert single config to multiple");
                }
            } else if ((0, _lodash.isPlainObject)(config)) {
                var result = new Config();

                if (isMulti) {
                    for (var k in config) {
                        result.keys.push(k);
                        result.push(result._merge({}, config[k]));
                    }
                } else {
                    result.keys.push(null);
                    result.push(result._merge({}, config));
                }

                return result;
            } else {
                throw new Error("Cannot coerce the given config");
            }
        }
    }]);

    function Config() {
        _classCallCheck(this, Config);

        var _this = _possibleConstructorReturn(this, (Config.__proto__ || Object.getPrototypeOf(Config)).call(this));

        Object.defineProperty(_this, "keys", {
            value: []
        });

        Object.defineProperty(_this, "defs", {
            value: []
        });

        Object.defineProperty(_this, "defineUpdaters", {
            value: []
        });
        return _this;
    }

    _createClass(Config, [{
        key: "get",
        value: function get(key) {
            var idx = this.keys.indexOf(key);
            if (idx >= 0) {
                return this[idx];
            } else {
                return null;
            }
        }
    }, {
        key: "each",
        value: function each(cb) {
            for (var _i in this.keys) {
                cb(this.keys[_i], this[_i], _i);
            }
        }
    }, {
        key: "update",
        value: function update(cfg) {
            var _this2 = this;

            cfg = Config.coerce(cfg, this.isMulti);

            var defineUpdaters = this.defineUpdaters.concat(cfg.defineUpdaters);
            this.defineUpdaters.length = 0;
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = defineUpdaters[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var v = _step.value;

                    this.defineUpdaters.push(v);
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

            if (this.length === 0) {
                cfg.each(function (k, v) {
                    _this2.keys.push(k);
                    _this2.push(_this2._merge({}, v));
                });
            } else {
                if (this.isMulti && !cfg.isMulti) {
                    throw new Error("Cannot merge, multi config with single config");
                }

                var base = {};

                if (cfg.isMulti && !this.isMulti) {
                    base = this[0];
                    this.length = 0;
                    this.keys.length = 0;
                }

                cfg.each(function (k, v) {
                    var idx = _this2.keys.indexOf(k);
                    if (idx === -1) {
                        _this2.keys.push(k);
                        _this2.push(_this2._merge(base, v));
                    } else {
                        _this2[idx] = _this2._merge(_this2[i], v);
                    }
                });
            }

            this._updateDefines(cfg);
        }
    }, {
        key: "ifMode",
        value: function ifMode(mode, overrides) {
            var _this3 = this;

            overrides = Config.coerce(overrides, this.isMulti);

            this.each(function (k, v, i) {
                if (v.mode === mode) {
                    var other = overrides.get(k);
                    if (other) {
                        _this3[i] = _this3._merge(_this3[i], other);
                    }
                }
            });

            this._updateDefines();

            return this;
        }
    }, {
        key: "define",
        value: function define(cb) {
            this.defineUpdaters.push(cb);
            this._updateDefines();
            return this;
        }
    }, {
        key: "_merge",
        value: function _merge(a, b) {
            var result = (0, _webpackMerge2.default)(a, b);
            substOptions(result);
            return result;
        }
    }, {
        key: "_updateDefines",
        value: function _updateDefines(cfg) {
            var _this4 = this;

            function replace(defs, inside, cb) {
                for (var k in inside) {
                    var v = inside[k];

                    if ((0, _lodash.isPlainObject)(v) || Array.isArray(v)) {
                        replace(defs, v, cb);
                    } else {
                        var replaced = cb(defs, v);
                        if (replaced) {
                            inside[k] = replaced;
                        }
                    }
                }
            }

            function replaceProxy(defs, inside) {
                replace(defs, inside, function (defs, value) {
                    if (value instanceof _defines.DefinesProxy) {
                        return defs.object;
                    }
                });
            }

            function replacePlugin(defs, inside) {
                replace(defs, inside, function (defs, value) {
                    if (value instanceof _webpack2.default.DefinePlugin && value.__anzar) {
                        return defs.plugin;
                    }
                });
            }

            this.each(function (k, v, i) {
                if (!_this4.defs[i]) {
                    var base = _defines.defines;
                    if (cfg) {
                        var cfgIdx = cfg.keys.indexOf(k);
                        if (cfgIdx > -1) {
                            base = cfg.defs[cfgIdx] || _defines.defines;
                        }
                    }
                    _this4.defs[i] = new _defines.Defines(base);
                }

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = _this4.defineUpdaters[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var updater = _step2.value;

                        updater(_this4.defs[i], v, k);
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

                _this4.defs[i].updateProxies();
                replaceProxy(_this4.defs[i], _this4[i]);
                replacePlugin(_this4.defs[i], _this4[i]);
            });
        }

        // update(overrides) {
        //     let cfg = this._merge(this, overrides)
        //     for (const k in cfg) {
        //         this[k] = cfg[k]
        //     }
        //     return this
        // }

        // each(cb) {
        //     for (const i in this.keys) {
        //         cb(this.keys[i], this.configs[i])
        //     }
        // }

        // ifMode(mode, overrides) {
        //     throw new Error("Must be ovverride")
        // }

        // postProcess() {
        //     this.each((k, cfg) => {

        //     })
        // }

        // _merge(a, b) {
        //     let cfg = webpackMerge(a, b)
        //     this._substOptions(cfg)
        //     return cfg
        // }

        // _substOptions(cfg) {
        //     for (const k in cfg) {
        //         let v = cfg[k]
        //         if (isPlainObject(v)) {
        //             this._substOptions(v)
        //         } else if (typeof v === "string") {
        //             cfg[k] = options.substitute(v)
        //         }
        //     }
        // }

    }, {
        key: "isMulti",
        get: function get() {
            return this.length > 1 || this.length > 0 && this.keys[0] !== null;
        }
    }]);

    return Config;
}(_extendableBuiltin(Array));