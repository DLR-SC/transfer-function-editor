
export interface AlphaStop {
    stop: number;
    alpha: number;
}

export interface ColorStop {
    stop: number;
    rgb: string;
}

export interface TransferFunction {
    alphaStops: Array<AlphaStop>;
    colorMap: Array<ColorStop>;
}

/**
 * This is for compatibility with ParaViews transfer functions.
 */
export interface ParaViewTransferFunction {
    /** The name of this transfer function. */
    Name: string;

    /** Gives information about how the RGBPoints are interpreted. */
    ColorSpace: ParaViewColorSpace;

    /** If it should be shown in the default selection. */
    DefaultMap?: boolean;

    /** The color that gets displayed for NAN values in RGB format. */
    NanColor?: [number, number, number];

    /** The alpha values. The format is:
     * [
     *  position_1, alpha_1, 0.5, 0.0,
     *  position_2, alpha_2, 0.5, 0.0,
     *  position_3, alpha_3, 0.5, 0.0,
     *  position_4, alpha_4, 0.5, 0.0,
     *  position_5, alpha_5, 0.5, 0.0
     * ]
     *
     * Note that the 0.5 and 0.0 values have no function.
     */
    Points: Array<number>;

    /**
     * The color values. Please note that they are NOT rgb values! Their interpretation is controlled by the ColorSpace
     * field. The format is:
     * [
     *  position_1, r_1, g_1, b_1,
     *  position_2, r_2, g_2, b_2,
     *  position_3, r_3, g_3, b_3,
     *  position_4, r_4, g_4, b_4,
     *  position_5, r_5, g_5, b_5
     * ]
     */
    RGBPoints: Array<number>;
}

export enum ParaViewColorSpace {
    RGB = "RGB",
    HSV = "HSV",
    LAB = "Lab",
    DIVERGING = "Diverging",
    LAB_CIEDE2000 = "Lab/CIEDE2000",
    STEP = "Step"
}

export type ParaViewTransferFunctions = Array<ParaViewTransferFunction>;

