"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DATA = Symbol("DATA");

var Options = exports.Options = function () {
    function Options() {
        _classCallCheck(this, Options);

        Object.defineProperty(this, DATA, {
            enumerable: false,
            writable: false,
            configurable: false,
            value: {}
        });

        this.set("___", Math.round(Math.rand() * 1000));
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
            var _this = this;

            return ("" + templateString).replace(/\[([^\]]+)\]/g, function (match, key) {
                return _this.get(key, match);
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