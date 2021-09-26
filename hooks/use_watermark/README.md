# useWatermark

## 技术实现
参考实现：[watermark-dom](https://github.com/saucxs/watermark-dom)。在此基础上用自定义hook+ts实现，并删除了无用代码，优化了计算逻辑，全局唯一id自动生成，增加了水印父元素、zindex、manual等参数

思路：使用attachShadow创建影子dom（影子DOM可以将一个完整的DOM树作为节点添加到父DOM树，实现DOM封装，即CSS样式和CSS选择器可以限制在影子DOM子树内。）影子根的pointer-events事件穿透属性设置为none，根据设定的父元素宽高、水印间隔等计算水印数量，设置水印dom的样式并插入到影子节点中。