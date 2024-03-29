# useWatermark

## 技术实现
参考实现：[watermark-dom](https://github.com/saucxs/watermark-dom)。在此基础上用自定义hook+ts实现，并删除了无用代码，优化了计算逻辑，全局唯一id自动生成，增加了水印父元素、zindex、manual等参数

思路：使用attachShadow创建影子dom（影子DOM可以将一个完整的DOM树作为节点添加到父DOM树，实现DOM封装，即CSS样式和CSS选择器可以限制在影子DOM子树内。）影子根的pointer-events事件穿透属性设置为none，根据设定的父元素宽高、水印间隔等计算水印数量，设置水印dom的样式并插入到影子节点中。


# useWatermarkKonva
主要使用canvas来绘制水印节点，其中引入了konva第三方库，第三方库内部处理了使用原生canvas会出现绘制出来的文字模糊等情况。

使用konva的主要原因是，业务需求需要水印的文字是不换行，不限制宽度的，在上个方案（useWatermark）中，其宽度是受限制的。原生的canvas api-ctx.measureText计算到的是文本旋转之前的宽度。
而konva库里的getClientRect方法，可以返回节点旋转之后的偏移值以及宽高，不需要自己再去计算。

此外，为了水印防删除功能，在上一个方案（useWatermark）中，直接是采用了定时查询目标元素的方案，小的文本节点还是可以删除，并且如果用window.MutationObserver方法去监听这整个document.body，会产生性能问题。
因此，在useWatermarkKonva方案中，采用了定时查询包裹水印的父元素 + 监听包裹水印的父元素两种结合。定时查询包裹水印的父元素，防止父元素被删除。监听包裹水印的父元素，方案是用canvas方案实现的，即总共只有三级节点，不会产生性能问题，并且能够防止小的文本节点被删
