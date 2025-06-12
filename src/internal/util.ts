import {InterpolationMethod} from '../CommonTypes';
import * as d3Interpolate from 'd3-interpolate';
import * as d3Hsv from 'd3-hsv';

/** Simple utility to clamp a number between two values. */
export function clamp(number: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, number));
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
