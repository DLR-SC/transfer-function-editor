import * as d3Scale from 'd3-scale';
import * as d3Interpolate from 'd3-interpolate';
import {AlphaMapBin, AlphaStop} from '../CommonTypes';

export default class AlphaRangeSampler {
  public set alphaStops(value: Array<AlphaStop>) {
    this._alphaStops = value;
    this._alphaRange = null;
  }

  public alphaAt(stop: number): number {
    return this.alphaRange(stop);
  }

  public sample(samples: number): Array<AlphaMapBin> {
    const min = this._alphaStops[0].stop;
    const max = this._alphaStops[this._alphaStops.length - 1].stop;
    const range = max - min;
    const binSize = range / samples;

    const result: Array<AlphaMapBin> = [];

    for (let i = 0; i < samples; i++) {
      const lowerBound = min + i * binSize;
      const upperBound = lowerBound + binSize;
      const center = (lowerBound + upperBound) / 2;
      const alpha = this.alphaRange(Math.floor(center * samples) / (samples - 1));
      result.push({lowerBound, center, upperBound, alpha});
    }

    return result;
  }

  private _alphaStops: Array<AlphaStop> = [];
  private _alphaRange: d3Scale.ScaleLinear<number, number> | null = null;

  private get alphaRange(): d3Scale.ScaleLinear<number, number> {
    if (this._alphaRange === null) {
      this._alphaRange = d3Scale
        .scaleLinear<number, number>()
        .domain(this._alphaStops.map((entry) => entry.stop))
        .range(this._alphaStops.map((entry) => entry.alpha))
        .interpolate(d3Interpolate.interpolateNumber);
    }

    return this._alphaRange;
  }
}