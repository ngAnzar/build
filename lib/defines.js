"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.defines = exports.Defines = exports.DefinesProxy = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _webpack = require("webpack");

var _webpack2 = _interopRequireDefault(_webpack);

var _options = require("./options");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PROXY_PLUGIN = Symbol("PROXY_PLUGIN");
var PROXY_OBJECT = Symbol("PROXY_OBJECT");
var PARENT = Symbol("PARENT");
var DATA = Symbol("DATA");

var DefinesProxy = exports.DefinesProxy = function DefinesProxy() {
    _classCallCheck(this, DefinesProxy);
};

var Defines = exports.Defines = function (_Options) {
    _inherits(Defines, _Options);

    function Defines(parent) {
        _classCallCheck(this, Defines);

        var _this = _possibleConstructorReturn(this, (Defines.__proto__ || Object.getPrototypeOf(Defines)).call(this));

        Object.defineProperty(_this, PROXY_PLUGIN, {
            enumerable: false,
            writable: false,
            configurable: false,
            value: {}
        });

        Object.defineProperty(_this, PROXY_OBJECT, {
            enumerable: false,
            writable: false,
            configurable: false,
            value: new DefinesProxy()
        });

        Object.defineProperty(_this, PARENT, {
            enumerable: false,
            writable: false,
            configurable: false,
            value: parent
        });
        return _this;
    }

    _createClass(Defines, [{
        key: "updateProxies",
        value: function updateProxies(target) {
            target = target == null ? this : target;

            if (this[PARENT]) {
                this[PARENT].updateProxies(target);
            }

            var proxyPlugin = target[PROXY_PLUGIN];
            var proxyObject = target[PROXY_OBJECT];

            this.each(function (k, v) {
                if (typeof v === "string") {
                    proxyPlugin[k] = JSON.stringify(v);
                } else {
                    proxyPlugin[k] = v;
                }
                proxyObject[k] = v;
            });
        }
    }, {
        key: "merge",
        value: function merge(other) {
            _get(Defines.prototype.__proto__ || Object.getPrototypeOf(Defines.prototype), "merge", this).call(this, other);
            this.updateProxies();
        }
    }, {
        key: "_storage",
        value: function _storage() {
            if (!this[DATA]) {
                this[DATA] = {};
            }
            return this[DATA];
        }
    }, {
        key: "plugin",
        get: function get() {
            var plugin = new _webpack2.default.DefinePlugin(this[PROXY_PLUGIN]);
            plugin.__anzar = true;
            return plugin;
        }
    }, {
        key: "object",
        get: function get() {
            return this[PROXY_OBJECT];
        }
    }]);

    return Defines;
}(_options.Options);

var defines = new Defines();
exports.defines = defines;