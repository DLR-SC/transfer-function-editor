import {LitElement} from 'lit';
import {Constructor} from '../util';
import {RangeMixin, RangeMixinInterface} from './RangeMixin';
import {ColorMapMixin, ColorMapMixinInterface} from './ColorMapMixin';
import {AlphaMapMixin, AlphaMapMixinInterface} from './AlphaMapMixin';
import {AlphaMapBin, ColorMapBin, ColorStop, TransferFunction} from '../../CommonTypes';
import * as d3Color from 'd3-color';

export declare class TransferFunctionMixinInterface {
  get transferFunction(): TransferFunction;
  get transferFunctionNormalized(): TransferFunction;

  public sampleAlphaColor(samples: number): Array<ColorMapBin & AlphaMapBin>;
  public sampleAlphaColorNormalized(samples: number): Array<ColorMapBin & AlphaMapBin>;

  alphaColor(stop: number): string;
  alphaColorNormalized(stop: number): string;
}

export const TransferFunctionMixin = <TBase extends Constructor<LitElement>>(
  base: TBase,
  defaultColorStops: Array<ColorStop> = [
    {stop: 0, color: 'black'},
    {stop: 1, color: 'black'},
  ]
) => {
  class TransferFunctionMixinClass extends AlphaMapMixin(ColorMapMixin(RangeMixin(base), defaultColorStops)) {
    get transferFunctionNormalized(): TransferFunction {
      return {alphaStops: this.alphaStopsNormalized, colorMap: this.colorMapNormalized};
    }

    get transferFunction(): TransferFunction {
      return {alphaStops: this.alphaStops, colorMap: this.colorMap};
    }

    public sampleAlphaColor(samples: number): Array<ColorMapBin & AlphaMapBin> {
      const colors = this.sampleColor(samples);
      const alphas = this.sampleAlpha(samples);

      return colors.map((color, i) => ({
        ...color,
        alpha: alphas[i].alpha,
      }));
    }

    public sampleAlphaColorNormalized(samples: number): Array<ColorMapBin & AlphaMapBin> {
      const colors = this.sampleColorNormalized(samples);
      const alphas = this.sampleAlphaNormalized(samples);

      return colors.map((color, i) => ({
        ...color,
        alpha: alphas[i].alpha,
      }));
    }

    public alphaColor(stop: number): string {
      const color = d3Color.rgb(this.color(stop));
      color.opacity = this.alpha(stop);
      return color.formatHex8();
    }

    public alphaColorNormalized(stop: number): string {
      const color = d3Color.rgb(this.colorNormalized(stop));
      color.opacity = this.alphaNormalized(stop);
      return color.formatHex8();
    }
  }

  return TransferFunctionMixinClass as Constructor<TransferFunctionMixinInterface> &
    Constructor<AlphaMapMixinInterface> &
    Constructor<ColorMapMixinInterface> &
    Constructor<RangeMixinInterface> &
    TBase;
};
