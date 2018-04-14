"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = pugTemplateLoader;

var _webpack = require("webpack");

var _webpack2 = _interopRequireDefault(_webpack);

var _htmlWebpackPlugin = require("html-webpack-plugin");

var _htmlWebpackPlugin2 = _interopRequireDefault(_htmlWebpackPlugin);

var _loaderUtils = require("loader-utils");

var _loaderUtils2 = _interopRequireDefault(_loaderUtils);

var _pug = require("pug");

var _pug2 = _interopRequireDefault(_pug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function extendDataWithDefines(data) {
    if (this._compilation && this._compilation.options && this._compilation.options.plugins) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = this._compilation.options.plugins[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var plugin = _step.value;

                if (plugin instanceof _webpack2.default.DefinePlugin) {
                    if (plugin.definitions) {
                        for (var k in plugin.definitions) {
                            switch (_typeof(plugin.definitions[k])) {
                                case "string":
                                    data[k] = JSON.parse(plugin.definitions[k]);
                                    break;
                                default:
                                    data[k] = plugin.definitions[k];
                            }
                        }
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
    }
}

function compileClient(content, ctx) {
    var result = function result(locals) {
        return template.body + "\n            module.exports = function(locals) {\n            return template(Object.assign(" + JSON.stringify(locals) + ",locals||{}));\n            }";
    };

    var template = _pug2.default.compileClientWithDependenciesTracked(content, ctx);
    result.dependencies = template.dependencies;
    return result;
}

function compileHtml(content, ctx) {
    var template = _pug2.default.compile(content, ctx);

    var result = function result(locals) {
        return "module.exports=" + JSON.stringify(template(locals)) + ";";
    };
    result.dependencies = template.dependencies;
    return result;
}

function pugTemplateLoader(content) {
    this.cacheable && this.cacheable();

    var data = {};
    extendDataWithDefines.call(this, data);

    var options = _loaderUtils2.default.getOptions(this) || {};
    var ctx = Object.assign({
        filename: this.resourcePath,
        doctype: options.doctype || "js",
        compileDebug: this.debug || false
    }, options);

    if (!ctx.data) {
        ctx.data = data;
    } else {
        ctx.data = Object.assign(data, ctx.data);
    }

    if (!ctx.filters) {
        ctx.filters = {};
    }

    var template = void 0;
    if (this.loaders.find(function (loader) {
        return (/html-webpack-plugin/.test(loader.path)
        );
    })) {
        template = compileClient(content, ctx);
    } else {
        template = compileHtml(content, ctx);
    }

    this.clearDependencies();
    template.dependencies.forEach(this.addDependency);

    return template(ctx.data);
}