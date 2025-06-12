import {LitElement, PropertyValues} from 'lit';
import {property} from 'lit/decorators.js';
import {AlphaMapBin, AlphaStop} from '../../CommonTypes';
import {RangeMixin, RangeMixinInterface} from './RangeMixin';
import {Constructor} from '../util';
import {DiscreteMixin, DiscreteMixinInterface} from './DiscreteMixin';
import AlphaRangeSampler from '../AlphaRangeSampler';

export declare class AlphaMapMixinInterface {
  alphaStops: Array<AlphaStop>;
  alphaStopsNormalized: Array<AlphaStop>;

  public alpha(stop: number): number;

  public alphaNormalized(stop: number): number;

  public sampleAlpha(samples: number): Array<AlphaMapBin>;

  public sampleAlphaNormalized(samples: number): Array<AlphaMapBin>;

  disableAlphaGrid: boolean;
  alphaGridSize: number;
}

export const AlphaMapMixin = <TBase extends Constructor<LitElement>>(base: TBase) => {
  class AlphaMapMixinClass extends DiscreteMixin(RangeMixin(base)) {
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
      return this.alphaRangeSampler.alphaAt(stop);
    }

    public alphaNormalized(stop: number): number {
      return this.alphaRangeSamplerNormalized.alphaAt(stop);
    }

    public sampleAlpha(samples: number): Array<AlphaMapBin> {
      return this.alphaRangeSampler.sample(samples);
    }

    public sampleAlphaNormalized(samples: number): Array<AlphaMapBin> {
      return this.alphaRangeSamplerNormalized.sample(samples);
    }

    @property({type: Boolean, attribute: 'disable-alpha-grid'})
    disableAlphaGrid: boolean = false;

    @property({type: Number, attribute: 'alpha-grid-size'})
    alphaGridSize: number = 8;


    private alphaRangeSampler: AlphaRangeSampler = new AlphaRangeSampler();
    private alphaRangeSamplerNormalized: AlphaRangeSampler = new AlphaRangeSampler();

    override update(changed: PropertyValues<this>) {
      super.update(changed);

      if (changed.has('alphaStops')) {
        this.alphaRangeSampler.alphaStops = this.alphaStops;
      }

      if (changed.has('alphaStopsNormalized')) {
        this.alphaRangeSamplerNormalized.alphaStops = this.alphaStopsNormalized;
      }
    }
  }

  return AlphaMapMixinClass as Constructor<AlphaMapMixinInterface> &
    Constructor<RangeMixinInterface> &
    Constructor<DiscreteMixinInterface> &
    TBase;
};
