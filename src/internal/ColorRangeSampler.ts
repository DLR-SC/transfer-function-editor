import {ColorMapBin, ColorStop, HSL, HSV, InterpolationMethod, RGB} from '../CommonTypes';
import {hsl as d3HSL, rgb as d3RGB} from 'd3-color';
import {hsv as d3HSV} from 'd3-hsv';
import * as d3Scale from 'd3-scale';
import {getColorInterpolator} from './util';

export default class ColorRangeSampler {
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