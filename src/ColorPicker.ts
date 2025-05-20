import {css, html, LitElement, PropertyValues} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import {hsv as d3HSV, HSVColor} from 'd3-hsv';
import {hsl as d3HSL, rgb as d3RGB} from 'd3-color';
import {drawControlPoint} from './internal/draw';
import {Color, HSL, HSV, RGB} from './CommonTypes';
import {clamp} from './internal/util';

@customElement('tfe-color-picker')
export class ColorPicker extends LitElement {
  /** Controls the size of the main canvas. This will most likely break the layout for now. */
  @property({type: Number})
  size: number = 256;

  /** The size of the control points. Odd numbers are preferable. */
  @property({type: Number})
  controlPointSize: number = 7;

  /** The color in hex format. As a side note, it is also possible to set any css color string here. */
  @property({type: String})
  set hex(value: string) {
    this.hsvInternal = d3HSV(value);

    if (!this.isUserEditingHex) {
      this.userHexInput = this.hex;
    }
  }

  get hex(): string {
    return this.hsvInternal.formatHex();
  }

  /** The color in HSV format. h is in range 0 - 360, s and v in range 0 - 100. */
  @property({type: Object})
  set hsv(value: HSV) {
    this.hsvInternal = d3HSV(value.h, value.s / 100, value.v / 100);
  }

  get hsv() {
    return {
      h: Math.round(this.hsvInternal.h),
      s: Math.round(this.hsvInternal.s * 100),
      v: Math.round(this.hsvInternal.v * 100),
    };
  }

  /** The color in normalized HSV format. All values are in range 0 - 1. */
  @property({type: Object})
  set hsvNormalized(value: HSV) {
    this.hsvInternal = d3HSV(value.h * 360, value.s, value.v);
  }

  get hsvNormalized() {
    return {h: this.hsvInternal.h / 360, s: this.hsvInternal.s, v: this.hsvInternal.v};
  }

  /** The color in HSL format. h is in range 0 - 360, s and l in range 0 - 100. */
  @property({type: Object})
  set hsl(value: HSL) {
    this.hsvInternal = d3HSV(d3HSL(value.h, value.s, value.l));
  }

  get hsl(): HSL {
    const hsl = d3HSL(this.hsvInternal.formatHsl());
    return {h: Math.round(hsl.h), s: Math.round(hsl.s * 100), l: Math.round(hsl.l * 100)};
  }

  /** The color in normalized HSL format. All values are in range 0 - 1. */
  @property({type: Object})
  set hslNormalized(value: HSL) {
    this.hsvInternal = d3HSV(d3HSL(value.h * 360, value.s, value.l));
  }

  get hslNormalized(): HSL {
    const hsl = d3HSL(this.hsvInternal.formatHsl());
    return {h: hsl.h / 360, s: hsl.s, l: hsl.l};
  }

  /** The color in RGB format. All values are in range from 0 to 255. */
  @property({type: Object})
  set rgb(value: RGB) {
    this.hsvInternal = d3HSV(d3RGB(Math.round(value.r), Math.round(value.g), Math.round(value.b)));
  }

  get rgb(): RGB {
    const rgb = this.hsvInternal.rgb();
    return {r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b)};
  }

  /** The color in normalized RGB format. All values are in range 0 - 1. */
  @property({type: Object})
  set rgbNormalized(value: RGB) {
    this.hsvInternal = d3HSV(d3RGB(Math.round(value.r * 255), Math.round(value.g * 255), Math.round(value.b * 255)));
  }

  get rgbNormalized(): RGB {
    const rgb = this.hsvInternal.rgb();
    return {r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255};
  }

  /**
   * Returns a collection of all different color representations of the currently selected color. RGB values are in the
   * range 0 - 255, hue is in the range 0 - 360, saturation, value and lightness are in the range 0 - 100.
   */
  public get color(): Color {
    return {rgb: this.rgb, hsl: this.hsl, hsv: this.hsv, hex: this.hex};
  }

  /**
   * Returns a collection of all different color representations of the currently selected color. All numerical values
   * are in the range 0 - 1.
   */
  public get colorNormalized(): Color {
    return {rgb: this.rgbNormalized, hsl: this.hslNormalized, hsv: this.hsvNormalized, hex: this.hex};
  }

  private _hsv: HSVColor = d3HSV('#FFFFFF');

  /** Saves the last valid hue value. */
  private backUpHue?: number;

  /** Saves the last valid saturation value. */
  private backUpSaturation?: number;

  /** This field is used to prevent cyclic updates. */
  private updateInProgress: boolean = false;

  @state()
  private set hsvInternal(hsv: HSVColor) {
    if (this.updateInProgress) return;
    this.updateInProgress = true;

    // Ensure that hue persists, even if the selected color is black or has no saturation.
    if (Number.isNaN(hsv.h)) {
      hsv.h = this.backUpHue ?? 180;
    }

    // Ensure that saturation persists, even if the selected color is black.
    if (Number.isNaN(hsv.s)) {
      hsv.s = this.backUpSaturation ?? 1;
    }

    this._hsv = d3HSV(hsv.h, hsv.s, hsv.v);

    this.backUpHue = this._hsv.h;
    this.backUpSaturation = this._hsv.s;

    this.dispatchEvent(
      new CustomEvent<ColorPicker>('change', {
        detail: this,
        bubbles: true,
        composed: true,
      })
    );
  }

  private get hsvInternal(): HSVColor {
    return this._hsv;
  }

  protected shouldUpdate(props: PropertyValues<this>): boolean {
    return (
      props.has('hex') || props.has('hsv') || props.has('rgb') || props.has('size') || props.has('controlPointSize')
    );
  }

  protected render() {
    const numberTemplate = (mf: {m: 'hsv'; f: 'h' | 's' | 'v'} | {m: 'rgb'; f: 'r' | 'g' | 'b'}, max: number) => html`
      <tfe-number-input
        class="tfe-color-picker-${mf.f}-input"
        .label="${mf.f}: "
        .min=${0}
        .max=${max}
        .value=${
          // @ts-ignore
          this[mf.m][mf.f]
        }
        @change=${(ev: CustomEvent<number>) => {
          ev.stopPropagation();
          // @ts-ignore
          this[mf.m] = {...this[mf.m], [mf.f]: ev.detail};
        }}
      ></tfe-number-input>
    `;

    return html`
      <div class="tfe-color-picker-root">
        <div class="tfe-color-picker-sv-picker" style="width: ${this.size}px; height: ${this.size}px">
          <canvas
            class="tfe-color-picker-sv-picker-canvas"
            width="${this.size}"
            height="${this.size}"
            @mousedown=${this.onSVMouseDown}
          />
        </div>
        <div class="tfe-color-picker-h-picker" style="height: ${this.size}px">
          <canvas
            class="tfe-color-picker-h-picker-canvas"
            width="18"
            height="${this.size}"
            style="background: linear-gradient(#f00, #f0f, #00f, #0ff, #0f0, #ff0, #f00)"
            @mousedown=${this.onHMouseDown}
          />
        </div>
        <form class="tfe-color-picker-input-root">
          <div class="tfe-color-preview" style="background: ${this.hex}"></div>
          <div></div>
          ${numberTemplate({m: 'hsv', f: 'h'}, 360)} ${numberTemplate({m: 'hsv', f: 's'}, 100)}
          ${numberTemplate({m: 'hsv', f: 'v'}, 100)}
          <div></div>
          ${numberTemplate({m: 'rgb', f: 'r'}, 255)} ${numberTemplate({m: 'rgb', f: 'g'}, 255)}
          ${numberTemplate({m: 'rgb', f: 'b'}, 255)}
          <div></div>
          <label
            >hex:
            <input
              class="tfe-color-picker-hex-input"
              type="text"
              minlength="4"
              maxlength="7"
              .value=${this.userHexInput}
              @input=${this.onHexChange}
              @blur=${this.onHexBlur}
              @focus=${() => (this.isUserEditingHex = true)}
            />
          </label>
        </form>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // This just insures internal validation for the default value.
    this.hsvInternal = this.hsvInternal;
    this.userHexInput = this.hex;

    // Stop the drag tracking and remove the move listener from the document.
    document.addEventListener('mouseup', () => {
      if (this.isDragging && this.abortController) {
        this.abortController.abort();
        this.abortController = null;
        this.isDragging = false;
      }
    });
  }

  protected updated(changed: PropertyValues<this>) {
    this.updateInProgress = false;

    if (!this.isUserEditingHex && (changed.has('hsv') || changed.has('rgb') || changed.has('hsl'))) {
      this.userHexInput = this.hex;
    }

    if (changed.has('hsv') || changed.has('size') || changed.has('controlPointSize')) {
      const oldHSV = changed.get('hsv') as HSV;

      if (
        Math.abs(oldHSV.s - this.hsv.s) >= 0 ||
        Math.abs(oldHSV.v - this.hsv.v) >= 0 ||
        changed.has('size') ||
        changed.has('controlPointSize')
      ) {
        this.renderSVCanvas();
      }

      if (Math.abs(oldHSV.h - this.hsv.h) >= 0 || changed.has('size') || changed.has('controlPointSize')) {
        this.renderHCanvas();
      }
    }
  }

  @state()
  private userHexInput: string = '#FFFFFF';
  private isUserEditingHex: boolean = false;

  @query('.tfe-color-picker-hex-input')
  private hexInput!: HTMLInputElement;

  private onHexChange() {
    const value = this.hexInput.value;
    this.userHexInput = value;
    this.isUserEditingHex = true;

    if (value.match(/#([0-7a-fA-F]{3}$|[0-7a-fA-F]{6}$)/)) {
      this.hex = value;
      this.hexInput.classList.remove('tfe-color-picker-input-hex-invalid');
    } else {
      this.hexInput.classList.add('tfe-color-picker-input-hex-invalid');
    }
  }

  private onHexBlur() {
    this.isUserEditingHex = false;
    const value = this.hexInput.value;
    if (!value.match(/#([0-7a-fA-F]{3}$|[0-7a-fA-F]{6}$)/)) {
      this.userHexInput = this.hex;
      this.hexInput.value = this.hex;
      this.hexInput.classList.remove('tfe-color-picker-input-hex-invalid');
    }
  }

  private isDragging = false;
  private abortController: AbortController | null = null;

  private onHMouseDown(e: MouseEvent) {
    const updateH = (y: number) => {
      this.hsv = {...this.hsv, h: clamp(Math.round((1 - y / this.size) * 360), 0, 360)};
    };

    if (e.button === 0) {
      this.abortController = new AbortController();
      document.addEventListener(
        'mousemove',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          updateH(e.clientY - this.svCanvas.getBoundingClientRect().y);
        },
        {signal: this.abortController.signal}
      );

      this.isDragging = true;
      updateH(e.offsetY);
    }
  }

  private onSVMouseDown(e: MouseEvent) {
    const updateSV = (x: number, y: number) => {
      this.hsv = {...this.hsv, s: clamp(x / this.size, 0, 1) * 100, v: clamp(1 - y / this.size, 0, 1) * 100};
    };

    if (e.button === 0) {
      this.abortController = new AbortController();
      document.addEventListener(
        'mousemove',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          updateSV(
            e.clientX - this.svCanvas.getBoundingClientRect().x,
            e.clientY - this.svCanvas.getBoundingClientRect().y
          );
        },
        {signal: this.abortController.signal}
      );

      this.isDragging = true;
      updateSV(e.offsetX, e.offsetY);
    }
  }

  @query('.tfe-color-picker-sv-picker-canvas')
  private svCanvas!: HTMLCanvasElement;

  private renderSVCanvas() {
    // We draw the saturation value picker in three steps:
    const context = this.svCanvas.getContext('2d', {alpha: false})!;

    // 1. Draw the current hue with full saturation and value as the background color.
    context.fillStyle = d3HSV(this.hsv.h, 1, 1).formatHex();
    context.fillRect(0, 0, this.size, this.size);

    // 2. Draw a white to transparent gradient for the saturation from left to right.
    const saturationGradient = context.createLinearGradient(0, this.size / 2, this.size, this.size / 2);
    saturationGradient.addColorStop(0, 'rgb(255, 255, 255)');
    saturationGradient.addColorStop(1, 'rgb(255, 255, 255, 0)');
    context.fillStyle = saturationGradient;
    context.fillRect(0, 0, this.size, this.size);

    // 3. Draw a black to transparent gradient for the value from bottom to top.
    const valueGradient = context.createLinearGradient(this.size / 2, this.size, this.size / 2, 0);
    valueGradient.addColorStop(0, 'rgb(0, 0, 0)');
    valueGradient.addColorStop(1, 'rgb(0, 0, 0, 0)');
    context.fillStyle = valueGradient;
    context.fillRect(0, 0, this.size, this.size);

    // Draw the control point. To ensure visibility everywhere it is an alternating circle in white and black.
    const x = (this.hsv.s * this.size) / 100;
    const y = (1 - this.hsv.v / 100) * this.size;
    drawControlPoint(context, x, y, this.controlPointSize);
  }

  @query('.tfe-color-picker-h-picker-canvas')
  private hCanvas!: HTMLCanvasElement;

  private renderHCanvas() {
    const context = this.hCanvas.getContext('2d', {alpha: true})!;
    // Draw the hue gradient.
    context.clearRect(0, 0, this.hCanvas.width, this.hCanvas.height);

    // Draw the control point. To ensure visibility everywhere, it is an alternating circle in white and black.
    const x = this.hCanvas.width / 2;
    const y = (1 - this.hsv.h / 360) * this.hCanvas.height;
    drawControlPoint(context, x, y, this.controlPointSize);
  }

  static styles = css`
    .tfe-color-picker-root {
      display: flex;
      justify-content: center;
    }

    .tfe-color-picker-sv-picker {
      border: 1px solid black;
    }

    .tfe-color-picker-h-picker {
      width: 18px;
      margin-left: 12px;
      border: 1px solid black;
    }

    .tfe-color-picker-input-root {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: space-between;
      align-content: space-evenly;
      margin-left: 12px;
      margin-bottom: 0;
    }

    .tfe-color-preview {
      height: 50px;
      width: 100%;
      border: 1px solid black;
      border-radius: 25px;
    }

    .tfe-color-picker-input-root > label {
      text-align: right;
    }

    .tfe-color-picker-input-root input,
    tfe-number-input::part(input-field) {
      width: 60px;
      text-align: right;
      font-family: monospace;
    }

    .tfe-color-picker-input-hex-invalid:focus-visible {
      outline-color: red;
    }
  `;
}
