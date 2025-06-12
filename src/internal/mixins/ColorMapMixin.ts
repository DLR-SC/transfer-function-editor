import {LitElement, PropertyValues} from 'lit';
import {property} from 'lit/decorators.js';
import {ColorMap, ColorMapBin, ColorStop, HSL, HSV, InterpolationMethod, RGB} from '../../CommonTypes';
import {RangeMixin, RangeMixinInterface} from './RangeMixin';
import {Constructor} from '../util';
import {DiscreteMixin, DiscreteMixinInterface} from './DiscreteMixin';
import ColorRangeSampler from '../ColorRangeSampler';

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

  rgb(stop: number): RGB;
  rgbNormalized(stop: number): RGB;

  hsl(stop: number): HSL;
  hslNormalized(stop: number): HSL;

  hsv(stop: number): HSV;
  hsvNormalized(stop: number): HSV;

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
  class ColorMapMixinClass extends DiscreteMixin(RangeMixin(base)) {
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

    private colorRangeSampler: ColorRangeSampler = new ColorRangeSampler();
    private colorRangeSamplerNormalized: ColorRangeSampler = new ColorRangeSampler();

    public color(stop: number): string {
      return this.colorRangeSampler.colorAt(stop);
    }

    public colorNormalized(stop: number): string {
      return this.colorRangeSamplerNormalized.colorAt(stop);
    }

    rgb(stop: number): RGB {
      return this.colorRangeSampler.rgbAt(stop);
    }

    rgbNormalized(stop: number): RGB {
      return this.colorRangeSamplerNormalized.rgbAt(stop);
    }

    hsl(stop: number): HSL {
      return this.colorRangeSampler.hslAt(stop);
    }

    hslNormalized(stop: number): HSL {
      return this.colorRangeSamplerNormalized.hslAt(stop);
    }

    hsv(stop: number): HSV {
      return this.colorRangeSampler.hsvAt(stop);
    }

    hsvNormalized(stop: number): HSV {
      return this.colorRangeSamplerNormalized.hsvAt(stop);
    }

    get discreteColorStops(): Array<ColorMapBin> | undefined {
      return this.discrete ? this.sampleColor(this.bins) : undefined;
    }

    get discreteColorStopsNormalized(): Array<ColorMapBin> | undefined {
      return this.discrete ? this.sampleColorNormalized(this.bins) : undefined;
    }

    public sampleColor(samples: number): Array<ColorMapBin> {
      return this.colorRangeSampler.sample(samples);
    }

    public sampleColorNormalized(samples: number): Array<ColorMapBin> {
      return this.colorRangeSamplerNormalized.sample(samples);
    }

    @property({type: String, attribute: 'interpolation-method'})
    interpolationMethod: InterpolationMethod = InterpolationMethod.HSL_LONG;

    @property({type: Boolean, attribute: 'show-stop-numbers'})
    showStopNumbers: boolean = false;

    @property({type: Boolean, attribute: 'interpolation-methods-editable'})
    interpolationMethodsEditable: boolean = false;

    @property({type: Boolean, attribute: 'bin-selector-editable'})
    binSelectorEditable: boolean = false;

    override update(changed: PropertyValues<this>) {
      super.update(changed);

      if (changed.has('colorStops')) {
        this.colorRangeSampler.colorStops = this.colorStops;
      }

      if (changed.has('colorStopsNormalized')) {
        this.colorRangeSamplerNormalized.colorStops = this.colorStopsNormalized;
      }

      if (changed.has('interpolationMethod')) {
        this.colorRangeSampler.interpolationMethod = this.interpolationMethod;
        this.colorRangeSamplerNormalized.interpolationMethod = this.interpolationMethod;
      }
    }
  }

  return ColorMapMixinClass as Constructor<ColorMapMixinInterface> & Constructor<RangeMixinInterface> & Constructor<DiscreteMixinInterface> & TBase;
};
