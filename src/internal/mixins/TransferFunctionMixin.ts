import {LitElement} from 'lit';
import {Constructor} from '../util';
import {RangeMixin, RangeMixinInterface} from './RangeMixin';
import {ColorMapMixin, ColorMapMixinInterface} from './ColorMapMixin';
import {AlphaMapMixin, AlphaMapMixinInterface} from './AlphaMapMixin';
import {ColorStop, TransferFunction} from '../../CommonTypes';
import * as d3Color from 'd3-color';

export declare class TransferFunctionMixinInterface {
  get transferFunctionNormalized(): TransferFunction;

  get transferFunction(): TransferFunction;

  rgba(stop: number): string;

  rgbaNormalized(stop: number): string;
}

export const TransferFunctionMixin = <TBase extends Constructor<LitElement>>(
  base: TBase,
  defaultColorStops: Array<ColorStop> = [
    {stop: 0, color: 'black'},
    {stop: 1, color: 'black'},
  ]
)=> {
  class TransferFunctionMixinClass extends AlphaMapMixin(ColorMapMixin(RangeMixin(base), defaultColorStops)) {
    /** Returns the complete transfer function including the alpha values and the color map. */
    get transferFunctionNormalized(): TransferFunction {
      return {alphaStops: this.alphaStopsNormalized, colorMap: this.colorMapNormalized};
    }

    /** Returns the complete transfer function including the alpha values and the color map. */
    get transferFunction(): TransferFunction {
      return {alphaStops: this.alphaStops, colorMap: this.colorMap};
    }

    /** Returns the color, including transparency, at the given stop. */
    public rgba(stop: number): string {
      const color = d3Color.rgb(this.rgb(stop));
      color.opacity = this.alpha(stop);
      return color.formatHex8();
    }

    /** Returns the color, including transparency, at the given stop. */
    public rgbaNormalized(stop: number): string {
      const color = d3Color.rgb(this.rgbNormalized(stop));
      color.opacity = this.alphaNormalized(stop);
      return color.formatHex8();
    }
  }

  return TransferFunctionMixinClass as Constructor<TransferFunctionMixinInterface> &
    Constructor<AlphaMapMixinInterface> &
    Constructor<ColorMapMixinInterface> &
    Constructor<RangeMixinInterface> &
    TBase;
}
