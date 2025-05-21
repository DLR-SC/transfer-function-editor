import {LitElement} from 'lit';
import {property} from 'lit/decorators.js';
import {Constructor} from '../util';

export declare class RangeMixinInterface {
  range: [number, number];
}

export const RangeMixin = <TBase extends Constructor<LitElement>>(base: TBase) => {
  class RangeMixinClass extends base {
    @property({type: Array})
    range: [number, number] = [0, 1];
  }

  return RangeMixinClass as Constructor<RangeMixinInterface> & TBase;
};
