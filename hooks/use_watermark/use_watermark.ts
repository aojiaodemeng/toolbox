import { useState, useRef, useCallback, useEffect } from 'react';
interface IWatermarkSettings{
    watermark_id: string;//水印总体的id
    watermark_prefix: string;//小水印的id前缀
    watermark_txt: string;//水印的内容
    watermark_x: number; //水印起始位置x轴坐标
    watermark_y: number; //水印起始位置Y轴坐标
    watermark_rows: number;//水印行数
    watermark_cols: number;//水印列数
    watermark_x_gap: number;//水印x轴间隔
    watermark_y_gap: number;//水印y轴间隔
    watermark_color: string;//水印字体颜色
    watermark_fontsize: string; //水印字体大小
    watermark_opacity: number; //水印透明度，要求设置在大于等于0.005
    watermark_width: number; //水印宽度
    watermark_height: number; //水印长度
    watermark_rotate: number; //水印倾斜度数
    watermark_parent_width: number;//水印的总体宽度（默认值：body的scrollWidth和clientWidth的较大值）
    watermark_parent_height: number; //水印的总体高度（默认值：body的scrollHeight和clientHeight的较大值）
    watermark_parent_node: null | string; //水印插件挂载的父元素element,不输入则默认挂在body上
    watermark_z_index: number; // 水印的z-index值
    manual: boolean;
}

const defaultSettings: IWatermarkSettings = {
    watermark_id: 'wm_div_id',
    watermark_prefix: 'maskDiv_id',
    watermark_txt:'维格星球',
    watermark_x:55,
    watermark_y:0,
    watermark_rows:0,
    watermark_cols:0,
    watermark_x_gap:80,
    watermark_y_gap: 80,
    watermark_color:'#000',
    watermark_fontsize:'12px',
    watermark_opacity:0.1,
    watermark_width:90,
    watermark_height:25,
    watermark_rotate:15,
    watermark_parent_width:0,
    watermark_parent_height:0,
    watermark_parent_node: null,
    watermark_z_index: 99999,
    manual: false,
};

let seed = 0;
const now = Date.now();

const getUuid = () => {
    const id = seed;
    seed += 1;
    return `wm_id_${now}_${id}`;
};

export function useRefCallback<T extends(...args: any[]) => any>(callback: T) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;
    return useCallback((...args: any[]) => callbackRef.current(...args), []) as T;
}

export const useWatermark = (props?: Partial<IWatermarkSettings>) => {
    const resizeLoadMark = useRef<any>();
    const timer = useRef<any>();
    const [globalSetting, setGlobalSetting] = useState(defaultSettings);
    useEffect(() => {
        if (!props) return;
        const newSettings = { ...defaultSettings, watermark_id: props && props.watermark_id ? props.watermark_id : getUuid() };
        Object.keys(props).forEach(key => {
            if (key === 'watermark_id') return;
            if (newSettings.hasOwnProperty(key) && newSettings[key] !== props[key]) {
                newSettings[key] = props[key];
            }
        });
    }, [props]);

    // 加载水印
    const loadMark = useRefCallback((settings: IWatermarkSettings) => {
        if (!settings.watermark_txt) {
            console.error('watermark_txt is null');
            return;
        }
        /*如果元素存在则移除*/
        const watermarkElement = document.getElementById(settings.watermark_id);
        watermarkElement && watermarkElement.parentNode && watermarkElement.parentNode.removeChild(watermarkElement);
        /*如果设置水印挂载的父元素的id*/
        const watermarkParentElement = settings.watermark_parent_node &&
            document.querySelector(settings.watermark_parent_node);
        const parentEle = watermarkParentElement || document.body;
        /*获取父元素的宽度*/
        const parentWidth = Math.max(parentEle.scrollWidth, parentEle.clientWidth);
        /*获取父元素的长度*/
        const parentHeight = Math.max(parentEle.scrollHeight, parentEle.clientHeight);

        let parentOffsetTop = 0;
        let parentOffsetLeft = 0;
        if (settings.watermark_parent_width || settings.watermark_parent_height) {
            /*指定父元素同时指定了宽或高*/
            if (parentEle) {
                parentOffsetTop = (parentEle as HTMLElement).offsetTop || 0;
                parentOffsetLeft = (parentEle as HTMLElement).offsetLeft || 0;
                settings.watermark_x = settings.watermark_x + parentOffsetLeft;
                settings.watermark_y = settings.watermark_y + parentOffsetTop;
            }
        } else {
            if (parentEle) {
                parentOffsetTop = (parentEle as HTMLElement).offsetTop || 0;
                parentOffsetLeft = (parentEle as HTMLElement).offsetLeft || 0;
            }
        }

        // 影子节点宿主
        let shadowHost = document.getElementById(settings.watermark_id);
        // 影子根
        let shadowRoot: null | ShadowRoot | HTMLElement = null;

        if (!shadowHost) {
            shadowHost = document.createElement('div');
            /*创建shadow dom*/
            shadowHost.id = settings.watermark_id;
            shadowHost.setAttribute(
                'style',
                'pointer-events: none !important; display: block !important'
            );
            /*判断浏览器是否支持attachShadow方法*/
            if (typeof shadowHost.attachShadow === 'function') {
                // createShadowRoot已弃用，使用attachShadow
                shadowRoot = shadowHost.attachShadow({ mode: 'open' });
            } else {
                shadowRoot = shadowHost;
            }
            /*将shadow dom随机插入body内的任意位置*/
            const nodeList = parentEle.children;
            const index = Math.floor(Math.random() * (nodeList.length - 1));
            if (nodeList[index]) {
                parentEle.insertBefore(shadowHost, nodeList[index]);
            } else {
                parentEle.appendChild(shadowHost);
            }
        } else if (shadowHost.shadowRoot) {
            shadowRoot = shadowHost.shadowRoot;
        }
        /*三种情况下会重新计算水印列数和x方向水印间隔：1、水印列数设置为0，2、水印宽度大于父元素宽度，3、水印宽度小于于父元素宽度*/
        settings.watermark_cols = Math.ceil((parentWidth - settings.watermark_x) / (settings.watermark_width + settings.watermark_x_gap));
        const tempWatermarkXGap = Math.floor(
            (parentWidth - settings.watermark_x - settings.watermark_width * settings.watermark_cols) / settings.watermark_cols);
        settings.watermark_x_gap = tempWatermarkXGap ? settings.watermark_x_gap : tempWatermarkXGap;
        // let allWatermarkWidth;

        /*三种情况下会重新计算水印行数和y方向水印间隔：1、水印行数设置为0，2、水印长度大于页面长度，3、水印长度小于于页面长度*/
        settings.watermark_rows = Math.ceil((parentHeight - settings.watermark_y) / (settings.watermark_height + settings.watermark_y_gap));
        const tempWatermarkYGap = Math.floor((
            (parentHeight - settings.watermark_y - settings.watermark_height * settings.watermark_rows) / settings.watermark_rows));
        settings.watermark_y_gap = tempWatermarkYGap ? settings.watermark_y_gap : tempWatermarkYGap;

        let x;
        let y;
        const maskDivWrap = document.createElement('div');
        maskDivWrap.setAttribute(
            'style',
            'pointer-events: none !important; display: block !important; position: absolute;overflow:hidden;left:0;right:0;top:0;bottom:0;margin:0px'
        );
        for (let i = 0; i < settings.watermark_rows; i++) {
            if (watermarkParentElement) {
                y =
                    parentOffsetTop + settings.watermark_y +
                    (settings.watermark_y_gap + settings.watermark_height) * i;
            } else {
                y = settings.watermark_y +
                    (settings.watermark_y_gap + settings.watermark_height) * i;
            }
            const jLength = i % 2 !== 0 ? settings.watermark_cols : settings.watermark_cols + 1;
            for (let j = 0; j < jLength; j++) {
                if (watermarkParentElement) {
                    x = parentOffsetLeft + settings.watermark_x +
                        (settings.watermark_width + settings.watermark_x_gap) * j + (i%2 !== 0 ? settings.watermark_width : 0);

                } else {
                    x = parentOffsetLeft + settings.watermark_x +
                        (settings.watermark_width + settings.watermark_x_gap) * j + (i%2 !== 0 ? settings.watermark_width : 0);
                }
                const maskDiv = document.createElement('div');
                const oText = document.createTextNode(settings.watermark_txt);
                maskDiv.appendChild(oText);
                /*设置水印相关属性start*/
                maskDiv.id = settings.watermark_prefix + i + j;
                /*设置水印div倾斜显示*/
                maskDiv.style.top = y + 'px';
                maskDiv.style.visibility = '';
                maskDiv.style.left = x + 'px';
                maskDiv.style.display = 'block';
                maskDiv.style.position = 'absolute';
                /*选不中*/
                maskDiv.style['-ms-user-select'] = 'none';
                maskDiv.style.color = settings.watermark_color;
                maskDiv.style.fontSize = settings.watermark_fontsize;
                maskDiv.style.width = settings.watermark_width + 'px';
                maskDiv.style.height = settings.watermark_height + 'px';
                maskDiv.style.zIndex = String(settings.watermark_z_index);
                maskDiv.style.opacity = String(settings.watermark_opacity);
                maskDiv.style.transform = 'rotate(-' + settings.watermark_rotate + 'deg)';

                /*设置水印相关属性end*/
                maskDivWrap.appendChild(maskDiv);
            }
        }
        shadowRoot && shadowRoot.appendChild(maskDivWrap);
    });

    const initWM = useRefCallback((settings?: Partial<IWatermarkSettings>) => {
        const newSettings = { ...globalSetting, watermark_id: settings && settings.watermark_id ? settings.watermark_id : getUuid() };
        settings && Object.keys(settings).forEach(key => {
            if (key === 'watermark_id') return;
            if (newSettings.hasOwnProperty(key) && newSettings[key] !== settings[key]) {
                newSettings[key] = settings[key];
            }
        });
        setGlobalSetting(newSettings);
        resizeLoadMark.current = () => {
            loadMark(newSettings);
        };
        resizeLoadMark.current();
        window.addEventListener('resize', resizeLoadMark.current);
        timer.current = window.setInterval(() => {
            const wmDom = document.getElementById(newSettings.watermark_id);
            if (!wmDom) {
                loadMark(newSettings);
            }
        }, 500);
    });

    // 移除水印
    const removeWM = useRefCallback((settings?: Partial<IWatermarkSettings>) => {
        const id = settings?.watermark_id || globalSetting.watermark_id;
        const watermarkElement = document.getElementById(id);
        if (watermarkElement) {
            const _parentElement = watermarkElement.parentNode;
            _parentElement && _parentElement.removeChild(watermarkElement);
        }
        window.removeEventListener('resize', resizeLoadMark.current);
        resizeLoadMark.current = null;
        window.clearInterval(timer.current);
        timer.current = null;
    });

    useEffect(() => {
        const run = !props || !props.manual;
        run && initWM(props);
        return () => {
            run && removeWM();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);
    return { initWM, removeWM };
};
