// This file contains building blocks to help construct a JSX namespace
export declare type HTMLElements = {
    a: HTMLAnchorElement;
    abbr: HTMLElement;
    address: HTMLElement;
    area: HTMLAreaElement;
    article: HTMLElement;
    aside: HTMLElement;
    audio: HTMLAudioElement;
    b: HTMLElement;
    base: HTMLBaseElement;
    bdi: HTMLElement;
    bdo: HTMLElement;
    big: HTMLElement;
    blockquote: HTMLQuoteElement;
    body: HTMLBodyElement;
    br: HTMLBRElement;
    button: HTMLButtonElement;
    canvas: HTMLCanvasElement;
    caption: HTMLTableCaptionElement;
    cite: HTMLElement;
    code: HTMLElement;
    col: HTMLTableColElement;
    colgroup: HTMLTableColElement;
    data: HTMLDataElement;
    datalist: HTMLDataListElement;
    dd: HTMLElement;
    del: HTMLModElement;
    details: HTMLDetailsElement;
    dfn: HTMLElement;
    dialog: HTMLDialogElement;
    div: HTMLDivElement;
    dl: HTMLDListElement;
    dt: HTMLElement;
    em: HTMLElement;
    embed: HTMLEmbedElement;
    fieldset: HTMLFieldSetElement;
    figcaption: HTMLElement;
    figure: HTMLElement;
    footer: HTMLElement;
    form: HTMLFormElement;
    h1: HTMLHeadingElement;
    h2: HTMLHeadingElement;
    h3: HTMLHeadingElement;
    h4: HTMLHeadingElement;
    h5: HTMLHeadingElement;
    h6: HTMLHeadingElement;
    head: HTMLHeadElement;
    header: HTMLElement;
    hgroup: HTMLElement;
    hr: HTMLHRElement;
    html: HTMLHtmlElement;
    i: HTMLElement;
    iframe: HTMLIFrameElement;
    img: HTMLImageElement;
    input: HTMLInputElement;
    ins: HTMLModElement;
    kbd: HTMLElement;
    keygen: HTMLUnknownElement;
    label: HTMLLabelElement;
    legend: HTMLLegendElement;
    li: HTMLLIElement;
    link: HTMLLinkElement;
    main: HTMLElement;
    map: HTMLMapElement;
    mark: HTMLElement;
    menu: HTMLMenuElement;
    menuitem: HTMLUnknownElement;
    meta: HTMLMetaElement;
    meter: HTMLMeterElement;
    nav: HTMLElement;
    noscript: HTMLElement;
    object: HTMLObjectElement;
    ol: HTMLOListElement;
    optgroup: HTMLOptGroupElement;
    option: HTMLOptionElement;
    output: HTMLOutputElement;
    p: HTMLParagraphElement;
    param: HTMLParamElement;
    picture: HTMLPictureElement;
    pre: HTMLPreElement;
    progress: HTMLProgressElement;
    q: HTMLQuoteElement;
    rp: HTMLElement;
    rt: HTMLElement;
    ruby: HTMLElement;
    s: HTMLElement;
    samp: HTMLElement;
    script: HTMLScriptElement;
    section: HTMLElement;
    select: HTMLSelectElement;
    slot: HTMLSlotElement;
    small: HTMLElement;
    source: HTMLSourceElement;
    span: HTMLSpanElement;
    strong: HTMLElement;
    style: HTMLStyleElement;
    sub: HTMLElement;
    summary: HTMLElement;
    sup: HTMLElement;
    table: HTMLTableElement;
    tbody: HTMLTableSectionElement;
    td: HTMLTableCellElement;
    textarea: HTMLTextAreaElement;
    tfoot: HTMLTableSectionElement;
    th: HTMLTableCellElement;
    thead: HTMLTableSectionElement;
    time: HTMLTimeElement;
    title: HTMLTitleElement;
    tr: HTMLTableRowElement;
    track: HTMLTrackElement;
    u: HTMLElement;
    ul: HTMLUListElement;
    var: HTMLElement;
    video: HTMLVideoElement;
    wbr: HTMLElement;
};

export declare type SVGElements = {
    svg: SVGSVGElement;
    animate: SVGAnimateElement;
    circle: SVGCircleElement;
    clipPath: SVGClipPathElement;
    defs: SVGDefsElement;
    desc: SVGDescElement;
    ellipse: SVGEllipseElement;
    feBlend: SVGFEBlendElement;
    feColorMatrix: SVGFEColorMatrixElement;
    feComponentTransfer: SVGFEComponentTransferElement;
    feComposite: SVGFECompositeElement;
    feConvolveMatrix: SVGFEConvolveMatrixElement;
    feDiffuseLighting: SVGFEDiffuseLightingElement;
    feDisplacementMap: SVGFEDisplacementMapElement;
    feFlood: SVGFEFloodElement;
    feGaussianBlur: SVGFEGaussianBlurElement;
    feImage: SVGFEImageElement;
    feMerge: SVGFEMergeElement;
    feMergeNode: SVGFEMergeNodeElement;
    feMorphology: SVGFEMorphologyElement;
    feOffset: SVGFEOffsetElement;
    feSpecularLighting: SVGFESpecularLightingElement;
    feTile: SVGFETileElement;
    feTurbulence: SVGFETurbulenceElement;
    filter: SVGFilterElement;
    foreignObject: SVGForeignObjectElement;
    g: SVGGElement;
    image: SVGImageElement;
    line: SVGLineElement;
    linearGradient: SVGLinearGradientElement;
    marker: SVGMarkerElement;
    mask: SVGMaskElement;
    path: SVGPathElement;
    pattern: SVGPatternElement;
    polygon: SVGPolygonElement;
    polyline: SVGPolylineElement;
    radialGradient: SVGRadialGradientElement;
    rect: SVGRectElement;
    stop: SVGStopElement;
    symbol: SVGSymbolElement;
    text: SVGTextElement;
    tspan: SVGTSpanElement;
    use: SVGUseElement;
};

type TargetedEvent
    <Target extends EventTarget = EventTarget, TypedEvent extends Event = Event>
    = Omit<TypedEvent, 'currentTarget'>
        & { readonly currentTarget: Target; };

type EventHandler <E extends TargetedEvent> = { (event: E): void; }

type AnimationEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, AnimationEvent>>;
type ClipboardEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, ClipboardEvent>>;
type CompositionEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, CompositionEvent>>;
type DragEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, DragEvent>>;
type FocusEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, FocusEvent>>;
type GenericEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target>>;
type KeyboardEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, KeyboardEvent>>;
type MouseEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, MouseEvent>>;
type PointerEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, PointerEvent>>;
type TouchEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, TouchEvent>>;
type TransitionEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, TransitionEvent>>;
type UIEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, UIEvent>>;
type WheelEventHandler
    <Target extends EventTarget> = EventHandler<TargetedEvent<Target, WheelEvent>>;

// Receives an element as Target such as HTMLDivElement
export declare type GenericEventAttrs<Target extends EventTarget> = {
    // Image Events
    onLoad?: GenericEventHandler<Target>;
    onLoadCapture?: GenericEventHandler<Target>;
    onError?: GenericEventHandler<Target>;
    onErrorCapture?: GenericEventHandler<Target>;

    // Clipboard Events
    onCopy?: ClipboardEventHandler<Target>;
    onCopyCapture?: ClipboardEventHandler<Target>;
    onCut?: ClipboardEventHandler<Target>;
    onCutCapture?: ClipboardEventHandler<Target>;
    onPaste?: ClipboardEventHandler<Target>;
    onPasteCapture?: ClipboardEventHandler<Target>;

    // Composition Events
    onCompositionEnd?: CompositionEventHandler<Target>;
    onCompositionEndCapture?: CompositionEventHandler<Target>;
    onCompositionStart?: CompositionEventHandler<Target>;
    onCompositionStartCapture?: CompositionEventHandler<Target>;
    onCompositionUpdate?: CompositionEventHandler<Target>;
    onCompositionUpdateCapture?: CompositionEventHandler<Target>;

    // Details Events
    onToggle?: GenericEventHandler<Target>;

    // Focus Events
    onFocus?: FocusEventHandler<Target>;
    onFocusCapture?: FocusEventHandler<Target>;
    onBlur?: FocusEventHandler<Target>;
    onBlurCapture?: FocusEventHandler<Target>;

    // Form Events
    onChange?: GenericEventHandler<Target>;
    onChangeCapture?: GenericEventHandler<Target>;
    onInput?: GenericEventHandler<Target>;
    onInputCapture?: GenericEventHandler<Target>;
    onSearch?: GenericEventHandler<Target>;
    onSearchCapture?: GenericEventHandler<Target>;
    onSubmit?: GenericEventHandler<Target>;
    onSubmitCapture?: GenericEventHandler<Target>;
    onInvalid?: GenericEventHandler<Target>;
    onInvalidCapture?: GenericEventHandler<Target>;

    // Keyboard Events
    onKeyDown?: KeyboardEventHandler<Target>;
    onKeyDownCapture?: KeyboardEventHandler<Target>;
    onKeyPress?: KeyboardEventHandler<Target>;
    onKeyPressCapture?: KeyboardEventHandler<Target>;
    onKeyUp?: KeyboardEventHandler<Target>;
    onKeyUpCapture?: KeyboardEventHandler<Target>;

    // Media Events
    onAbort?: GenericEventHandler<Target>;
    onAbortCapture?: GenericEventHandler<Target>;
    onCanPlay?: GenericEventHandler<Target>;
    onCanPlayCapture?: GenericEventHandler<Target>;
    onCanPlayThrough?: GenericEventHandler<Target>;
    onCanPlayThroughCapture?: GenericEventHandler<Target>;
    onDurationChange?: GenericEventHandler<Target>;
    onDurationChangeCapture?: GenericEventHandler<Target>;
    onEmptied?: GenericEventHandler<Target>;
    onEmptiedCapture?: GenericEventHandler<Target>;
    onEncrypted?: GenericEventHandler<Target>;
    onEncryptedCapture?: GenericEventHandler<Target>;
    onEnded?: GenericEventHandler<Target>;
    onEndedCapture?: GenericEventHandler<Target>;
    onLoadedData?: GenericEventHandler<Target>;
    onLoadedDataCapture?: GenericEventHandler<Target>;
    onLoadedMetadata?: GenericEventHandler<Target>;
    onLoadedMetadataCapture?: GenericEventHandler<Target>;
    onLoadStart?: GenericEventHandler<Target>;
    onLoadStartCapture?: GenericEventHandler<Target>;
    onPause?: GenericEventHandler<Target>;
    onPauseCapture?: GenericEventHandler<Target>;
    onPlay?: GenericEventHandler<Target>;
    onPlayCapture?: GenericEventHandler<Target>;
    onPlaying?: GenericEventHandler<Target>;
    onPlayingCapture?: GenericEventHandler<Target>;
    onProgress?: GenericEventHandler<Target>;
    onProgressCapture?: GenericEventHandler<Target>;
    onRateChange?: GenericEventHandler<Target>;
    onRateChangeCapture?: GenericEventHandler<Target>;
    onSeeked?: GenericEventHandler<Target>;
    onSeekedCapture?: GenericEventHandler<Target>;
    onSeeking?: GenericEventHandler<Target>;
    onSeekingCapture?: GenericEventHandler<Target>;
    onStalled?: GenericEventHandler<Target>;
    onStalledCapture?: GenericEventHandler<Target>;
    onSuspend?: GenericEventHandler<Target>;
    onSuspendCapture?: GenericEventHandler<Target>;
    onTimeUpdate?: GenericEventHandler<Target>;
    onTimeUpdateCapture?: GenericEventHandler<Target>;
    onVolumeChange?: GenericEventHandler<Target>;
    onVolumeChangeCapture?: GenericEventHandler<Target>;
    onWaiting?: GenericEventHandler<Target>;
    onWaitingCapture?: GenericEventHandler<Target>;

    // MouseEvents
    onClick?: MouseEventHandler<Target>;
    onClickCapture?: MouseEventHandler<Target>;
    onContextMenu?: MouseEventHandler<Target>;
    onContextMenuCapture?: MouseEventHandler<Target>;
    onDblClick?: MouseEventHandler<Target>;
    onDblClickCapture?: MouseEventHandler<Target>;
    onDrag?: DragEventHandler<Target>;
    onDragCapture?: DragEventHandler<Target>;
    onDragEnd?: DragEventHandler<Target>;
    onDragEndCapture?: DragEventHandler<Target>;
    onDragEnter?: DragEventHandler<Target>;
    onDragEnterCapture?: DragEventHandler<Target>;
    onDragExit?: DragEventHandler<Target>;
    onDragExitCapture?: DragEventHandler<Target>;
    onDragLeave?: DragEventHandler<Target>;
    onDragLeaveCapture?: DragEventHandler<Target>;
    onDragOver?: DragEventHandler<Target>;
    onDragOverCapture?: DragEventHandler<Target>;
    onDragStart?: DragEventHandler<Target>;
    onDragStartCapture?: DragEventHandler<Target>;
    onDrop?: DragEventHandler<Target>;
    onDropCapture?: DragEventHandler<Target>;
    onMouseDown?: MouseEventHandler<Target>;
    onMouseDownCapture?: MouseEventHandler<Target>;
    onMouseEnter?: MouseEventHandler<Target>;
    onMouseEnterCapture?: MouseEventHandler<Target>;
    onMouseLeave?: MouseEventHandler<Target>;
    onMouseLeaveCapture?: MouseEventHandler<Target>;
    onMouseMove?: MouseEventHandler<Target>;
    onMouseMoveCapture?: MouseEventHandler<Target>;
    onMouseOut?: MouseEventHandler<Target>;
    onMouseOutCapture?: MouseEventHandler<Target>;
    onMouseOver?: MouseEventHandler<Target>;
    onMouseOverCapture?: MouseEventHandler<Target>;
    onMouseUp?: MouseEventHandler<Target>;
    onMouseUpCapture?: MouseEventHandler<Target>;

    // Selection Events
    onSelect?: GenericEventHandler<Target>;
    onSelectCapture?: GenericEventHandler<Target>;

    // Touch Events
    onTouchCancel?: TouchEventHandler<Target>;
    onTouchCancelCapture?: TouchEventHandler<Target>;
    onTouchEnd?: TouchEventHandler<Target>;
    onTouchEndCapture?: TouchEventHandler<Target>;
    onTouchMove?: TouchEventHandler<Target>;
    onTouchMoveCapture?: TouchEventHandler<Target>;
    onTouchStart?: TouchEventHandler<Target>;
    onTouchStartCapture?: TouchEventHandler<Target>;

    // Pointer Events
    onPointerOver?: PointerEventHandler<Target>;
    onPointerOverCapture?: PointerEventHandler<Target>;
    onPointerEnter?: PointerEventHandler<Target>;
    onPointerEnterCapture?: PointerEventHandler<Target>;
    onPointerDown?: PointerEventHandler<Target>;
    onPointerDownCapture?: PointerEventHandler<Target>;
    onPointerMove?: PointerEventHandler<Target>;
    onPointerMoveCapture?: PointerEventHandler<Target>;
    onPointerUp?: PointerEventHandler<Target>;
    onPointerUpCapture?: PointerEventHandler<Target>;
    onPointerCancel?: PointerEventHandler<Target>;
    onPointerCancelCapture?: PointerEventHandler<Target>;
    onPointerOut?: PointerEventHandler<Target>;
    onPointerOutCapture?: PointerEventHandler<Target>;
    onPointerLeave?: PointerEventHandler<Target>;
    onPointerLeaveCapture?: PointerEventHandler<Target>;
    onGotPointerCapture?: PointerEventHandler<Target>;
    onGotPointerCaptureCapture?: PointerEventHandler<Target>;
    onLostPointerCapture?: PointerEventHandler<Target>;
    onLostPointerCaptureCapture?: PointerEventHandler<Target>;

    // UI Events
    onScroll?: UIEventHandler<Target>;
    onScrollCapture?: UIEventHandler<Target>;

    // Wheel Events
    onWheel?: WheelEventHandler<Target>;
    onWheelCapture?: WheelEventHandler<Target>;

    // Animation Events
    onAnimationStart?: AnimationEventHandler<Target>;
    onAnimationStartCapture?: AnimationEventHandler<Target>;
    onAnimationEnd?: AnimationEventHandler<Target>;
    onAnimationEndCapture?: AnimationEventHandler<Target>;
    onAnimationIteration?: AnimationEventHandler<Target>;
    onAnimationIterationCapture?: AnimationEventHandler<Target>;

    // Transition Events
    onTransitionEnd?: TransitionEventHandler<Target>;
    onTransitionEndCapture?: TransitionEventHandler<Target>;
};

// Note: HTML elements will also need GenericEventAttributes
export declare type HTMLAttrs = {
    // Standard HTML Attributes
    accept?: string;
    acceptCharset?: string;
    accessKey?: string;
    action?: string;
    allowFullScreen?: boolean;
    allowTransparency?: boolean;
    alt?: string;
    as?: string;
    async?: boolean;
    autocomplete?: string;
    autoComplete?: string;
    autocorrect?: string;
    autoCorrect?: string;
    autofocus?: boolean;
    autoFocus?: boolean;
    autoPlay?: boolean;
    capture?: boolean;
    cellPadding?: number | string;
    cellSpacing?: number | string;
    charSet?: string;
    challenge?: string;
    checked?: boolean;
    class?: string;
    className?: string;
    cols?: number;
    colSpan?: number;
    content?: string;
    contentEditable?: boolean;
    contextMenu?: string;
    controls?: boolean;
    controlsList?: string;
    coords?: string;
    crossOrigin?: string;
    data?: string;
    dateTime?: string;
    default?: boolean;
    defer?: boolean;
    dir?: 'auto' | 'rtl' | 'ltr';
    disabled?: boolean;
    disableRemotePlayback?: boolean;
    download?: unknown;
    draggable?: boolean;
    encType?: string;
    form?: string;
    formAction?: string;
    formEncType?: string;
    formMethod?: string;
    formNoValidate?: boolean;
    formTarget?: string;
    frameBorder?: number | string;
    headers?: string;
    height?: number | string;
    hidden?: boolean;
    high?: number;
    href?: string;
    hrefLang?: string;
    for?: string;
    htmlFor?: string;
    httpEquiv?: string;
    icon?: string;
    id?: string;
    inputMode?: string;
    integrity?: string;
    is?: string;
    keyParams?: string;
    keyType?: string;
    kind?: string;
    label?: string;
    lang?: string;
    list?: string;
    loop?: boolean;
    low?: number;
    manifest?: string;
    marginHeight?: number;
    marginWidth?: number;
    max?: number | string;
    maxLength?: number;
    media?: string;
    mediaGroup?: string;
    method?: string;
    min?: number | string;
    minLength?: number;
    multiple?: boolean;
    muted?: boolean;
    name?: string;
    nonce?: string;
    noValidate?: boolean;
    open?: boolean;
    optimum?: number;
    pattern?: string;
    placeholder?: string;
    playsInline?: boolean;
    poster?: string;
    preload?: string;
    radioGroup?: string;
    readOnly?: boolean;
    rel?: string;
    required?: boolean;
    role?: string;
    rows?: number;
    rowSpan?: number;
    sandbox?: string;
    scope?: string;
    scoped?: boolean;
    scrolling?: string;
    seamless?: boolean;
    selected?: boolean;
    shape?: string;
    size?: number;
    sizes?: string;
    slot?: string;
    span?: number;
    spellcheck?: boolean;
    src?: string;
    srcset?: string;
    srcDoc?: string;
    srcLang?: string;
    srcSet?: string;
    start?: number;
    step?: number | string;
    style?: string | { [key: string]: string | number };
    summary?: string;
    tabIndex?: number;
    target?: string;
    title?: string;
    type?: string;
    useMap?: string;
    value?: string | string[] | number;
    volume?: string | number;
    width?: number | string;
    wmode?: string;
    wrap?: string;

    // RDFa Attributes
    about?: string;
    datatype?: string;
    inlist?: unknown;
    prefix?: string;
    property?: string;
    resource?: string;
    typeof?: string;
    vocab?: string;

    // Microdata Attributes
    itemProp?: string;
    itemScope?: boolean;
    itemType?: string;
    itemID?: string;
    itemRef?: string;
};

// Note: SVG elements will also need HTMLAttributes and GenericEventAttributes
export declare type SVGAttrs = {
    accentHeight?: number | string;
    accumulate?: 'none' | 'sum';
    additive?: 'replace' | 'sum';
    alignmentBaseline?:
        | 'auto'
        | 'baseline'
        | 'before-edge'
        | 'text-before-edge'
        | 'middle'
        | 'central'
        | 'after-edge'
        | 'text-after-edge'
        | 'ideographic'
        | 'alphabetic'
        | 'hanging'
        | 'mathematical'
        | 'inherit';
    allowReorder?: 'no' | 'yes';
    alphabetic?: number | string;
    amplitude?: number | string;
    arabicForm?: 'initial' | 'medial' | 'terminal' | 'isolated';
    ascent?: number | string;
    attributeName?: string;
    attributeType?: string;
    autoReverse?: number | string;
    azimuth?: number | string;
    baseFrequency?: number | string;
    baselineShift?: number | string;
    baseProfile?: number | string;
    bbox?: number | string;
    begin?: number | string;
    bias?: number | string;
    by?: number | string;
    calcMode?: number | string;
    capHeight?: number | string;
    clip?: number | string;
    clipPath?: string;
    clipPathUnits?: number | string;
    clipRule?: number | string;
    colorInterpolation?: number | string;
    colorInterpolationFilters?: 'auto' | 'sRGB' | 'linearRGB' | 'inherit';
    colorProfile?: number | string;
    colorRendering?: number | string;
    contentScriptType?: number | string;
    contentStyleType?: number | string;
    cursor?: number | string;
    cx?: number | string;
    cy?: number | string;
    d?: string;
    decelerate?: number | string;
    descent?: number | string;
    diffuseConstant?: number | string;
    direction?: number | string;
    display?: number | string;
    divisor?: number | string;
    dominantBaseline?: number | string;
    dur?: number | string;
    dx?: number | string;
    dy?: number | string;
    edgeMode?: number | string;
    elevation?: number | string;
    enableBackground?: number | string;
    end?: number | string;
    exponent?: number | string;
    externalResourcesRequired?: number | string;
    fill?: string;
    fillOpacity?: number | string;
    fillRule?: 'nonzero' | 'evenodd' | 'inherit';
    filter?: string;
    filterRes?: number | string;
    filterUnits?: number | string;
    floodColor?: number | string;
    floodOpacity?: number | string;
    focusable?: number | string;
    fontFamily?: string;
    fontSize?: number | string;
    fontSizeAdjust?: number | string;
    fontStretch?: number | string;
    fontStyle?: number | string;
    fontVariant?: number | string;
    fontWeight?: number | string;
    format?: number | string;
    from?: number | string;
    fx?: number | string;
    fy?: number | string;
    g1?: number | string;
    g2?: number | string;
    glyphName?: number | string;
    glyphOrientationHorizontal?: number | string;
    glyphOrientationVertical?: number | string;
    glyphRef?: number | string;
    gradientTransform?: string;
    gradientUnits?: string;
    hanging?: number | string;
    horizAdvX?: number | string;
    horizOriginX?: number | string;
    ideographic?: number | string;
    imageRendering?: number | string;
    in2?: number | string;
    in?: string;
    intercept?: number | string;
    k1?: number | string;
    k2?: number | string;
    k3?: number | string;
    k4?: number | string;
    k?: number | string;
    kernelMatrix?: number | string;
    kernelUnitLength?: number | string;
    kerning?: number | string;
    keyPoints?: number | string;
    keySplines?: number | string;
    keyTimes?: number | string;
    lengthAdjust?: number | string;
    letterSpacing?: number | string;
    lightingColor?: number | string;
    limitingConeAngle?: number | string;
    local?: number | string;
    markerEnd?: string;
    markerHeight?: number | string;
    markerMid?: string;
    markerStart?: string;
    markerUnits?: number | string;
    markerWidth?: number | string;
    mask?: string;
    maskContentUnits?: number | string;
    maskUnits?: number | string;
    mathematical?: number | string;
    mode?: number | string;
    numOctaves?: number | string;
    offset?: number | string;
    opacity?: number | string;
    operator?: number | string;
    order?: number | string;
    orient?: number | string;
    orientation?: number | string;
    origin?: number | string;
    overflow?: number | string;
    overlinePosition?: number | string;
    overlineThickness?: number | string;
    paintOrder?: number | string;
    panose1?: number | string;
    pathLength?: number | string;
    patternContentUnits?: string;
    patternTransform?: number | string;
    patternUnits?: string;
    pointerEvents?: number | string;
    points?: string;
    pointsAtX?: number | string;
    pointsAtY?: number | string;
    pointsAtZ?: number | string;
    preserveAlpha?: number | string;
    preserveAspectRatio?: string;
    primitiveUnits?: number | string;
    r?: number | string;
    radius?: number | string;
    refX?: number | string;
    refY?: number | string;
    renderingIntent?: number | string;
    repeatCount?: number | string;
    repeatDur?: number | string;
    requiredExtensions?: number | string;
    requiredFeatures?: number | string;
    restart?: number | string;
    result?: string;
    rotate?: number | string;
    rx?: number | string;
    ry?: number | string;
    scale?: number | string;
    seed?: number | string;
    shapeRendering?: number | string;
    slope?: number | string;
    spacing?: number | string;
    specularConstant?: number | string;
    specularExponent?: number | string;
    speed?: number | string;
    spreadMethod?: string;
    startOffset?: number | string;
    stdDeviation?: number | string;
    stemh?: number | string;
    stemv?: number | string;
    stitchTiles?: number | string;
    stopColor?: string;
    stopOpacity?: number | string;
    strikethroughPosition?: number | string;
    strikethroughThickness?: number | string;
    string?: number | string;
    stroke?: string;
    strokeDasharray?: string | number;
    strokeDashoffset?: string | number;
    strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit';
    strokeLinejoin?: 'miter' | 'round' | 'bevel' | 'inherit';
    strokeMiterlimit?: string;
    strokeOpacity?: number | string;
    strokeWidth?: number | string;
    surfaceScale?: number | string;
    systemLanguage?: number | string;
    tableValues?: number | string;
    targetX?: number | string;
    targetY?: number | string;
    textAnchor?: string;
    textDecoration?: number | string;
    textLength?: number | string;
    textRendering?: number | string;
    to?: number | string;
    transform?: string;
    u1?: number | string;
    u2?: number | string;
    underlinePosition?: number | string;
    underlineThickness?: number | string;
    unicode?: number | string;
    unicodeBidi?: number | string;
    unicodeRange?: number | string;
    unitsPerEm?: number | string;
    vAlphabetic?: number | string;
    values?: string;
    vectorEffect?: number | string;
    version?: string;
    vertAdvY?: number | string;
    vertOriginX?: number | string;
    vertOriginY?: number | string;
    vHanging?: number | string;
    vIdeographic?: number | string;
    viewBox?: string;
    viewTarget?: number | string;
    visibility?: number | string;
    vMathematical?: number | string;
    widths?: number | string;
    wordSpacing?: number | string;
    writingMode?: number | string;
    x1?: number | string;
    x2?: number | string;
    x?: number | string;
    xChannelSelector?: string;
    xHeight?: number | string;
    xlinkActuate?: string;
    xlinkArcrole?: string;
    xlinkHref?: string;
    xlinkRole?: string;
    xlinkShow?: string;
    xlinkTitle?: string;
    xlinkType?: string;
    xmlBase?: string;
    xmlLang?: string;
    xmlns?: string;
    xmlnsXlink?: string;
    xmlSpace?: string;
    y1?: number | string;
    y2?: number | string;
    y?: number | string;
    yChannelSelector?: string;
    z?: number | string;
    zoomAndPan?: string;
};
