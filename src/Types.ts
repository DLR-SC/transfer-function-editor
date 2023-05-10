export interface AlphaStop {
  stop: number;
  alpha: number;
}

export interface ColorStop {
  stop: number;
  color: string;
}

export interface TransferFunction {
  alphaStops: Array<AlphaStop>;
  colorMap: ColorMap;
}

export interface ColorMap {
  colorStops: Array<ColorStop>;
  interpolationMethod: InterpolationMethod;
  discrete?: boolean;
  bins?: number;
}

export interface ColorMapBin {
  lowerBound: number;
  center: number;
  upperBound: number;
  color: string;
}

export enum InterpolationMethod {
  RGB = "RGB",
  HSL = "HSL",
  HSL_LONG = "HSL_LONG",
  HSV = "HSV",
  HSV_LONG = "HSV_LONG",
  HCL = "HCL",
  HCL_LONG = "HCL_LONG",
  LAB = "LAB",
  CUBEHELIX = "CUBEHELIX",
  CUBEHELIX_LONG = "CUBEHELIX_LONG",
}
