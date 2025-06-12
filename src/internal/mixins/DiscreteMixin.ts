import {LitElement} from 'lit';
import {property} from 'lit/decorators.js';
import {Constructor} from '../util';

export declare class DiscreteMixinInterface {
  discrete: boolean;
  bins: number;
}

export const DiscreteMixin = <TBase extends Constructor<LitElement>>(base: TBase) => {
  class DiscreteMixinClass extends base {
    @property({type: Boolean})
    discrete: boolean = false;

    @property({type: Number})
    bins: number = 7;
  }

  return DiscreteMixinClass as Constructor<DiscreteMixinInterface> & TBase;
};
