import {
  AlphaMapBin,
  AlphaStop,
  ColorMapBin,
  ColorStop,
  HSL,
  HSV,
  InterpolationMethod,
  RGB,
} from '../CommonTypes';
import * as d3Scale from 'd3-scale';
import * as d3Interpolate from 'd3-interpolate';
import * as d3Hsv from 'd3-hsv';
import {hsl as d3HSL, rgb as d3RGB} from 'd3-color';
import {hsv as d3HSV} from 'd3-hsv';

/** Simple utility to clamp a number between two values. */
export function clamp(number: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, number));
}

export class ColorRangeSampler {
  public set colorStops(value: Array<ColorStop>) {
    this._colorStops = value;
    this._colorRange = null;
  }

  public set interpolationMethod(value: InterpolationMethod) {
    this._interpolationMethod = value;
    this._colorRange = null;
  }

  public colorAt(stop: number): string {
    return this.colorRange(stop);
  }

  public rgbAt(stop: number): RGB {
    const rgb = d3RGB(this.colorRange(stop));
    return {r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b)};
  }

  public rgbNormalizedAt(stop: number): RGB {
    const rgb = d3RGB(this.colorRange(stop));
    return {r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255};
  }

  public hsvAt(stop: number): HSV {
    const hsv = d3HSV(this.colorRange(stop));
    return {h: Math.round(hsv.h), s: Math.round(hsv.s), v: Math.round(hsv.v)};
  }

  public hsvNormalizedAt(stop: number): HSV {
    const hsv = d3HSV(this.colorRange(stop));
    return {h: hsv.h / 255, s: hsv.s / 255, v: hsv.v / 255};
  }

  public hslAt(stop: number): HSL {
    const hsl = d3HSL(this.colorRange(stop));
    return {h: Math.round(hsl.h), s: Math.round(hsl.s), l: Math.round(hsl.l)};
  }

  public hslNormalizedAt(stop: number): HSL {
    const hsl = d3HSL(this.colorRange(stop));
    return {h: hsl.h / 255, s: hsl.s / 255, l: hsl.l / 255};
  }

  public sample(samples: number): Array<ColorMapBin> {
    const min = this._colorStops[0].stop;
    const max = this._colorStops[this._colorStops.length - 1].stop;
    const range = max - min;
    const binSize = range / samples;

    const result: Array<ColorMapBin> = [];

    for (let i = 0; i < samples; i++) {
      const lowerBound = min + i * binSize;
      const upperBound = lowerBound + binSize;
      const center = (lowerBound + upperBound) / 2;
      const color = this.colorRange(Math.floor(center * samples) / (samples - 1));
      result.push({lowerBound, center, upperBound, color});
    }

    return result;
  }

  private _colorStops: Array<ColorStop> = [];
  private _interpolationMethod: InterpolationMethod = InterpolationMethod.HSL;

  private _colorRange: d3Scale.ScaleLinear<string, string> | null = null;

  private get colorRange(): d3Scale.ScaleLinear<string, string> {
    if (this._colorRange === null) {
      this._colorRange = d3Scale
        .scaleLinear<string, number>()
        .domain(this._colorStops.map((entry) => entry.stop))
        .range(this._colorStops.map((entry) => entry.color))
        .interpolate(getColorInterpolator(this._interpolationMethod));
    }

    return this._colorRange;
  }
}

const alphaRangeCache = new WeakMap<Array<AlphaStop>, d3Scale.ScaleLinear<number, number>>();

/**
 * This utility function creates an alpha range method from d3 to the alpha stops. It also does some caching, since
 * this is an expensive object to create.
 */
export function getAlphaRange(alphaStops: Array<AlphaStop>): d3Scale.ScaleLinear<number, number> {
  if (alphaRangeCache.has(alphaStops)) {
    return alphaRangeCache.get(alphaStops)!;
  }

  const alphaRange = d3Scale
    .scaleLinear<number, number>()
    .domain(alphaStops.map((entry) => entry.stop))
    .range(alphaStops.map((entry) => entry.alpha))
    .interpolate(d3Interpolate.interpolateNumber);
  alphaRangeCache.set(alphaStops, alphaRange);
  return alphaRange;
}

/** This function returns an array of bins with their alpha. */
export function sampleAlphaMap(alphaStops: Array<AlphaStop>, samples: number): Array<AlphaMapBin> {
  const min = alphaStops[0].stop;
  const max = alphaStops[alphaStops.length - 1].stop;
  const range = max - min;
  const binSize = range / samples;

  const alphaRange = getAlphaRange(alphaStops);
  const result: Array<AlphaMapBin> = [];

  for (let i = 0; i < samples; i++) {
    const lowerBound = min + i * binSize;
    const upperBound = lowerBound + binSize;
    const center = (lowerBound + upperBound) / 2;
    const alpha = alphaRange(Math.floor(center * samples) / (samples - 1));
    result.push({lowerBound, center, upperBound, alpha});
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

export type Constructor<T = {}> = new (...args: any[]) => T;
