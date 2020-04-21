const stylusNode = require("stylus/lib/nodes")
const stylusUtil = require("stylus/lib/utils")
const { resolveIcon } = require("./iconfont")


function iconFunctionFactory(stylus, resolvePath, contextPath, registry) {
    function nzIcon(name, size) {
        stylusUtil.assertType(name, "string", "name")
        stylusUtil.assertType(size, "unit", "size")

        name = stylusUtil.unwrap(name).first.val
        size = stylusUtil.unwrap(size).first.val

        const [icoPackage, icoPath] = resolveIcon(name, resolvePath, contextPath)
        const icoData = registry.add(icoPackage, icoPath, size)

        const group = new stylusNode.Group()
        group.nodes.push(new stylusNode.Selector([new stylusNode.Literal("&::before")]))

        const block = new stylusNode.Block(this.closestBlock, group)
        block.nodes.push(
            new stylusNode.Property([stylusUtil.coerce("display")], stylusUtil.coerce("inline-block")),
            new stylusNode.Property([stylusUtil.coerce("overflow")], stylusUtil.coerce("hidden")),
            new stylusNode.Property([stylusUtil.coerce("font")], stylusUtil.coerce([
                "normal",
                icoData.fontWeight,
                new stylusNode.Literal(`${icoData.fontSize}/1`),
                icoData.fontFamily])),
            new stylusNode.Property([stylusUtil.coerce("vertical-align")], stylusUtil.coerce("middle")),
            new stylusNode.Property([stylusUtil.coerce("text-align")], stylusUtil.coerce("center")),
            new stylusNode.Property([stylusUtil.coerce("content")], stylusUtil.coerce("\\" + icoData.codepoint.toString(16))),
        )

        group.block = block
        return group
    }
    nzIcon.params = ["name", "size"]
    nzIcon.raw = true

    stylus.define("nz-icon", nzIcon)
}

module.exports = { iconFunctionFactory }
