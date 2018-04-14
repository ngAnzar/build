"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.root = root;

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function root(location) {
    return _path2.default.resolve(__dirname, "..", location);
}