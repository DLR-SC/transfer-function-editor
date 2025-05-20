import {LitElement} from 'lit';
import {property} from 'lit/decorators.js';
import {AlphaStop} from '../../CommonTypes';
import {RangeMixin, RangeMixinInterface} from './RangeMixin';
import {Constructor, getAlphaRange} from '../util';

export declare class AlphaMapMixinInterface {
  alphaStopsNormalized: Array<AlphaStop>;
  alphaStops: Array<AlphaStop>;

  public alphaNormalized(stop: number): number;

  public alpha(stop: number): number;

  disableAlphaGrid: boolean;
  alphaGridSize: number;
}

export const AlphaMapMixin = <TBase extends Constructor<LitElement>>(base: TBase) => {
  class AlphaMapMixinClass extends RangeMixin(base) {
    @property({type: Array, attribute: 'alpha-stops-normalized'})
    alphaStopsNormalized: Array<AlphaStop> = [
      {stop: 0, alpha: 0},
      {stop: 0.5, alpha: 0.5},
      {stop: 1, alpha: 1},
    ];

    @property({type: Array, attribute: 'alpha-stops'})
    get alphaStops(): Array<AlphaStop> {
      return this.alphaStopsNormalized.map((stop) => ({
        stop: stop.stop * (this.range[1] - this.range[0]) + this.range[0],
        alpha: stop.alpha,
      }));
    }

    set alphaStops(value: Array<AlphaStop>) {
      this.alphaStopsNormalized = value.map((stop) => ({
        stop: (stop.stop - this.range[0]) / (this.range[1] - this.range[0]),
        alpha: stop.alpha,
      }));
    }

    public alpha(stop: number): number {
      return this.alphaNormalized(stop - this.range[0] / (this.range[1] - this.range[0]));
    }

    public alphaNormalized(stop: number): number {
      return getAlphaRange(this.alphaStopsNormalized)(stop);
    }

    @property({type: Boolean, attribute: 'disable-alpha-grid'})
    disableAlphaGrid: boolean = false;

    @property({type: Number, attribute: 'alpha-grid-size'})
    alphaGridSize: number = 8;
  }

  return AlphaMapMixinClass as Constructor<AlphaMapMixinInterface> & Constructor<RangeMixinInterface> & TBase;
};
