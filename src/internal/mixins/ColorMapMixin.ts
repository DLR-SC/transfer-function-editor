import {LitElement} from 'lit';
import {property} from 'lit/decorators.js';
import {ColorMap, ColorMapBin, ColorStop, InterpolationMethod} from '../../CommonTypes';
import {RangeMixin, RangeMixinInterface} from './RangeMixin';
import {Constructor, getColorFromColorMapAt, sampleColorMap} from '../util';

export declare class ColorMapMixinInterface {
  colorStops: Array<ColorStop>;
  colorStopsNormalized: Array<ColorStop>;

  get discreteColorStops(): Array<ColorMapBin> | undefined;
  get discreteColorStopsNormalized(): Array<ColorMapBin> | undefined;

  interpolationMethod: InterpolationMethod;
  discrete: boolean;
  bins: number;

  colorMap: ColorMap;
  colorMapNormalized: ColorMap;

  color(stop: number): string;
  colorNormalized(stop: number): string;

  public sampleColor(samples: number): Array<ColorMapBin>;
  public sampleColorNormalized(samples: number): Array<ColorMapBin>;

  showStopNumbers: boolean;
  interpolationMethodsEditable: boolean;
  binSelectorEditable: boolean;
}

export const ColorMapMixin = <TBase extends Constructor<LitElement>>(
  base: TBase,
  defaultColorStops: Array<ColorStop> = [
    {stop: 0, color: 'green'},
    {stop: 0.5, color: 'yellow'},
    {stop: 1, color: 'red'},
  ]
) => {
  class ColorMapMixinClass extends RangeMixin(base) {
    @property({type: Array, attribute: 'color-stops-normalized'})
    colorStopsNormalized: Array<ColorStop> = defaultColorStops;

    @property({type: Array, attribute: 'color-stops'})
    set colorStops(value: Array<ColorStop>) {
      this.colorStopsNormalized = value.map((stop) => ({
        stop: (stop.stop - this.range[0]) / (this.range[1] - this.range[0]),
        color: stop.color,
      }));
    }

    get colorStops(): Array<ColorStop> {
      return this.colorStopsNormalized.map((stop) => ({
        stop: stop.stop * (this.range[1] - this.range[0]) + this.range[0],
        color: stop.color,
      }));
    }

    @property({type: Object, attribute: 'color-map-normalized'})
    get colorMapNormalized(): ColorMap {
      return {
        colorStops: this.colorStopsNormalized,
        interpolationMethod: this.interpolationMethod,
        discreteColorStops: this.discreteColorStopsNormalized,
        discrete: this.discrete || undefined,
        bins: this.discrete ? this.bins : undefined,
      };
    }

    set colorMapNormalized(value: ColorMap) {
      this.colorStopsNormalized = value.colorStops;
      this.interpolationMethod = value.interpolationMethod;
      this.discrete = value.discrete ?? false;
      this.bins = value.bins ?? 7;
    }

    @property({type: Object, attribute: 'color-map'})
    get colorMap(): ColorMap {
      return {
        colorStops: this.colorStops,
        discreteColorStops: this.discreteColorStops,
        interpolationMethod: this.interpolationMethod,
        discrete: this.discrete || undefined,
        bins: this.discrete ? this.bins : undefined,
      };
    }

    set colorMap(value: ColorMap) {
      this.colorStops = value.colorStops;
      this.interpolationMethod = value.interpolationMethod;
      this.discrete = value.discrete ?? false;
      this.bins = value.bins ?? 7;
    }

    public color(stop: number): string {
      return getColorFromColorMapAt(this.colorMap, stop - this.range[0] / (this.range[1] - this.range[0]));
    }

    public colorNormalized(stop: number): string {
      return getColorFromColorMapAt(this.colorMapNormalized, stop);
    }

    get discreteColorStops(): Array<ColorMapBin> | undefined {
      return this.discrete ? this.sampleColor(this.bins) : undefined;
    }
    get discreteColorStopsNormalized(): Array<ColorMapBin> | undefined {
      return this.discrete ? this.sampleColorNormalized(this.bins) : undefined;
    }

    public sampleColor(samples: number): Array<ColorMapBin> {
      return sampleColorMap(this.colorStops, this.interpolationMethod, samples);
    }

    public sampleColorNormalized(samples: number): Array<ColorMapBin> {
      return sampleColorMap(this.colorStopsNormalized, this.interpolationMethod, samples);
    }

    @property({type: String, attribute: 'interpolation-method'})
    interpolationMethod: InterpolationMethod = InterpolationMethod.HSL_LONG;

    @property({type: Boolean})
    discrete: boolean = false;

    @property({type: Number})
    bins: number = 7;

    @property({type: Boolean, attribute: 'show-stop-numbers'})
    showStopNumbers: boolean = false;

    @property({type: Boolean, attribute: 'interpolation-methods-editable'})
    interpolationMethodsEditable: boolean = false;

    @property({type: Boolean, attribute: 'bin-selector-editable'})
    binSelectorEditable: boolean = false;
  }

  return ColorMapMixinClass as Constructor<ColorMapMixinInterface> & Constructor<RangeMixinInterface> & TBase;
};
