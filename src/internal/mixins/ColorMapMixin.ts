import {LitElement} from 'lit';
import {property} from 'lit/decorators.js';
import {ColorMap, ColorMapBin, ColorStop, InterpolationMethod} from '../../CommonTypes';
import {RangeMixin, RangeMixinInterface} from './RangeMixin';
import {Constructor, getColorFromColorMapAt, getColorMapBins} from '../util';

export declare class ColorMapMixinInterface {
  colorStopsNormalized: Array<ColorStop>;
  colorStops: Array<ColorStop>;
  interpolationMethod: InterpolationMethod;
  discrete: boolean;
  bins: number;

  colorMapNormalized: ColorMap;
  colorMap: ColorMap;

  rgb(stop: number): string;
  rgbNormalized(stop: number): string;

  get discreteColorMapNormalized(): Array<ColorMapBin>;
  get discreteColorMap(): Array<ColorMapBin>;

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
)=> {
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
        discrete: this.discrete || undefined,
        bins: this.discrete ? this.bins : undefined,
      };
    }

    set colorMapNormalized(value: ColorMap) {
      this.colorStopsNormalized = value.colorStops;
      this.interpolationMethod = value.interpolationMethod;
      this.discrete = value.discrete || false;
      this.bins = value.bins || 7;
    }

    @property({type: Object, attribute: 'color-map'})
    get colorMap(): ColorMap {
      return {
        colorStops: this.colorStops,
        interpolationMethod: this.interpolationMethod,
        discrete: this.discrete || undefined,
        bins: this.discrete ? this.bins : undefined,
      };
    }

    set colorMap(value: ColorMap) {
      this.colorStops = value.colorStops;
      this.interpolationMethod = value.interpolationMethod;
      this.discrete = value.discrete || false;
      this.bins = value.bins || 7;
    }

    public rgb(stop: number): string {
      return getColorFromColorMapAt(this.colorMap, stop - this.range[0] / (this.range[1] - this.range[0]));
    }

    public rgbNormalized(stop: number): string {
      return getColorFromColorMapAt(this.colorMapNormalized, stop);
    }

    get discreteColorMapNormalized(): Array<ColorMapBin> {
      return getColorMapBins(this.colorMapNormalized);
    }

    get discreteColorMap(): Array<ColorMapBin> {
      return getColorMapBins(this.colorMap);
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
    interpolationMethodsEditable: boolean = true;

    @property({type: Boolean, attribute: 'bin-selector-editable'})
    binSelectorEditable: boolean = true;
  }

  return ColorMapMixinClass as Constructor<ColorMapMixinInterface> & Constructor<RangeMixinInterface> & TBase;
}
