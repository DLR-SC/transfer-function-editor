import * as d3Interpolate from "d3-interpolate";
import * as d3Hsv from "d3-hsv";
import { ColorMap, InterpolationMethod } from "./Types";
import * as d3Scale from "d3-scale";

export function getColorFromColorMapAt(colorMap: ColorMap, value: number): string {
  const colorRange = d3Scale
    .scaleLinear<string, number>()
    .domain(colorMap.colorStops.map((entry) => entry.stop))
    .range(colorMap.colorStops.map((entry) => entry.color))
    .interpolate(getColorInterpolator(colorMap.interpolationMethod));

  if (colorMap.discrete && colorMap.bins) {
    return colorRange(Math.floor(value * colorMap.bins) / (colorMap.bins - 1));
  }

  return colorRange(value);
}

export function getColorInterpolator(interpolationMethods: InterpolationMethod) {
  switch (interpolationMethods) {
    case InterpolationMethod.RGB:
      return d3Interpolate.interpolateRgb;
    case InterpolationMethod.HSL:
      return d3Interpolate.interpolateHsl;
    case InterpolationMethod.HSL_LONG:
      return d3Interpolate.interpolateHslLong;
    case InterpolationMethod.HSV:
      return d3Hsv.interpolateHsv;
    case InterpolationMethod.HSV_LONG:
      return d3Hsv.interpolateHsvLong;
    case InterpolationMethod.HCL:
      return d3Interpolate.interpolateHcl;
    case InterpolationMethod.HCL_LONG:
      return d3Interpolate.interpolateHclLong;
    case InterpolationMethod.LAB:
      return d3Interpolate.interpolateLab;
    case InterpolationMethod.CUBEHELIX:
      return d3Interpolate.interpolateCubehelix;
    case InterpolationMethod.CUBEHELIX_LONG:
      return d3Interpolate.interpolateCubehelixLong;
  }
}