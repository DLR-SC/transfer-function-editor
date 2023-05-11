/** A single entry for the transparency component of a transfer function. */
export interface AlphaStop {
  /** The value at which the alpha value applies. */
  stop: number;

  /** The amount of transparency. 0 is fully transparent, 1 is fully opaque. */
  alpha: number;
}

/** A single entry for the color component of a transfer function. */
export interface ColorStop {
  /** The value at which the color applies. */
  stop: number;

  /** A CSS color string. */
  color: string;
}

/** A complete color map. */
export interface ColorMap {
  /** The colors at the specified stops. */
  colorStops: Array<ColorStop>;

  /** The method on how the color between stops is being computed. */
  interpolationMethod: InterpolationMethod;

  /** If the color map has discrete bins. */
  discrete?: boolean;

  /** The number of bins in this color map. */
  bins?: number;
}

/** Combines transparency and color to create a transfer function. */
export interface TransferFunction {
  /** Defines the function of transparency. */
  alphaStops: Array<AlphaStop>;

  /** Defines the function of color. */
  colorMap: ColorMap;
}

/** For discrete color maps this defines a bin. */
export interface ColorMapBin {
  /** The minimum value of this bin. */
  lowerBound: number;

  /** The middle value of the bin. */
  center: number;

  /** The maximum value of this bin. */
  upperBound: number;

  /** The color that applies to the whole bin. */
  color: string;
}

/** The methods of interpolation between color stops. See https://github.com/d3/d3-interpolate#color-spaces. */
export enum InterpolationMethod {
  RGB = 'RGB',
  HSL = 'HSL',
  HSL_LONG = 'HSL_LONG',
  HSV = 'HSV',
  HSV_LONG = 'HSV_LONG',
  HCL = 'HCL',
  HCL_LONG = 'HCL_LONG',
  LAB = 'LAB',
  CUBEHELIX = 'CUBEHELIX',
  CUBEHELIX_LONG = 'CUBEHELIX_LONG',
}
