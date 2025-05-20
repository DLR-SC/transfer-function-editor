import {html, LitElement, PropertyValues} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {TransferFunctionMixin} from './internal/mixins/TransferFunctionMixin';
import {ColorMapEditor} from './ColorMapEditor';
import {TransparencyEditor} from './TransparencyEditor';

@customElement('tfe-transfer-function-editor')
export class TransferFunctionEditor extends TransferFunctionMixin(LitElement, [
  {stop: 0, color: 'green'},
  {stop: 0.5, color: 'yellow'},
  {stop: 1, color: 'red'},
]) {
  @property({type: Number, attribute: 'control-point-size'})
  controlPointSize: number = 7;

  @property({type: String})
  width: string = '100%';

  @property({type: String})
  height: string = '100%';

  protected render() {
    return html`
      <div class="tfe-transfer-function-editor-root" style="display: flex; flex-direction: column; gap: 5px">
        <tfe-transparency-editor
          .alphaStopsNormalized="${this.alphaStopsNormalized}"
          .colorMapNormalized="${this.colorMapNormalized}"
          .range=${this.range}
          .width=${this.width}
          .height='calc(0.85 * ${this.height})'
          @change=${(ev: CustomEvent<TransparencyEditor>) => {
            this.alphaStopsNormalized = ev.detail.alphaStopsNormalized;
          }}
        ></tfe-transparency-editor>
        <tfe-color-map-editor
          .colorMapNormalized="${this.colorMapNormalized}"
          .range=${this.range}
          show-stop-numbers
          .width=${this.width}
          .height='calc(0.15 * ${this.height})'
          @change=${(ev: CustomEvent<ColorMapEditor>) => {
            this.colorMapNormalized = ev.detail.colorMapNormalized;
          }}
      </div>
    `;
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('colorStopsNormalized') || changed.has('alphaStopsNormalized')) {
      this.dispatchEvent(
        new CustomEvent<TransferFunctionEditor>('change', {
          detail: this,
          bubbles: true,
          composed: true,
        })
      );
    }
  }
}
