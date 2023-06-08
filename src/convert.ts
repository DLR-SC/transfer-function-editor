import * as d3Interpolate from 'd3-interpolate';
import * as d3Hsv from 'd3-hsv';
import {ColorMap, ColorMapBin, InterpolationMethod} from './Types';
import * as d3Scale from 'd3-scale';

const colorRangeCache = new WeakMap<ColorMap, d3Scale.ScaleLinear<string, string>>();

/**
 * This utility function creates a color range method from d3 to the given color map. It also does some caching, since
 * this is an expensive object to create.
 */
export function getColorRange(colorMap: ColorMap): d3Scale.ScaleLinear<string, string> {
  if (colorRangeCache.has(colorMap)) {
    return colorRangeCache.get(colorMap);
  }

  const colorRange = d3Scale
    .scaleLinear<string, number>()
    .domain(colorMap.colorStops.map((entry) => entry.stop))
    .range(colorMap.colorStops.map((entry) => entry.color))
    .interpolate(getColorInterpolator(colorMap.interpolationMethod));
  colorRangeCache.set(colorMap, colorRange);
  return colorRange;
}

/**
 * This function returns a color for a value in the given color map.
 */
export function getColorFromColorMapAt(colorMap: ColorMap, value: number): string {
  const colorRange = getColorRange(colorMap);
  if (colorMap.discrete && colorMap.bins) {
    return colorRange(Math.floor(value * colorMap.bins) / (colorMap.bins - 1));
  }

  return colorRange(value);
}

/**
 * This function returns an array of bins with their color, if the color map is discrete. Otherwise, it will return an
 * empty array.
 */
export function getColorMapBins(colorMap: ColorMap): Array<ColorMapBin> {
  if (!colorMap.discrete || !colorMap.bins) {
    return [];
  }

  const min = colorMap.colorStops[0].stop;
  const max = colorMap.colorStops[colorMap.colorStops.length - 1].stop;
  const range = max - min;
  const binSize = range / colorMap.bins;

  const colorRange = getColorRange(colorMap);
  const result: Array<ColorMapBin> = [];

  for (let i = 0; i < colorMap.bins; i++) {
    const lowerBound = min + i * binSize;
    const upperBound = lowerBound + binSize;
    const center = (lowerBound + upperBound) / 2;
    const color = colorRange(Math.floor(center * colorMap.bins) / (colorMap.bins - 1));
    result.push({lowerBound, center, upperBound, color});
  }

  return result;
}

/**
 * This is a helper method, mapping the InterpolationMethod enum to d3 interpolation functions.
 */
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
