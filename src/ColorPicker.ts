import {hsl as d3HSL, rgb as d3RGB} from 'd3-color';
import {hsv, hsv as d3HSV, HSVColor} from 'd3-hsv';

document.head.innerHTML += `<style>
    .tfe-color-picker-root {
        display: flex;
        justify-content: center;
    }

    .tfe-color-picker-sl-picker {
        border: 1px solid grey;
    }

    .tfe-color-picker-h-picker {
        width: 18px;
        margin-left: 12px;
        border: 1px solid grey;
    }

    .tfe-color-picker-input-root {
        display: grid;
        grid-template-columns: 36px 60px;
        grid-template-rows: repeat(3, auto) 20px repeat(3, auto) 20px auto;
        grid-column-gap: 6px;
        grid-row-gap: 6px;
        align-items: center;
        align-content: space-evenly;
        margin-left: 12px;
        margin-bottom: 0;
    }

    .tfe-color-preview {
        grid-column: 1 / span 2;
        height: 50px;
        border: 1px solid grey;
    }

    .tfe-color-picker-input-root > label {
        text-align: right;
    }

    .tfe-color-picker-input-root > input {
        text-align: right;
        font-family: monospace;
    }

    .tfe-color-picker-input-hex-invalid:focus-visible {
        outline-color: red;
    }
</style>`;

export class ColorPicker {
  private container: HTMLElement;
  private hsv: HSVColor;
  private backUpHue;
  private backUpSaturation;
  private readonly svCanvas: HTMLCanvasElement;
  private svContext: CanvasRenderingContext2D;
  private readonly hCanvas: HTMLCanvasElement;
  private hContext: CanvasRenderingContext2D;
  private readonly CANVAS_SIZE: number = 256;
  private controlPointSize: number = 7;

  private callback: (newColor: Color) => void;

  private inputFields: {
    h: HTMLInputElement;
    s: HTMLInputElement;
    v: HTMLInputElement;
    r: HTMLInputElement;
    g: HTMLInputElement;
    b: HTMLInputElement;
    hex: HTMLInputElement;
  };

  private previewElement: HTMLDivElement;

  constructor(container: HTMLElement | string, options?: {initialColor?: string}) {
    if (container) {
      if (typeof container === 'string') {
        this.container = document.querySelector(container);
      } else {
        this.container = container;
      }
    } else {
      throw 'No element given!';
    }

    this.hsv = d3HSV(options?.initialColor || '#FFF');
    if (Number.isNaN(this.hsv.h)) {
      this.hsv.h = 180;
    }

    if (Number.isNaN(this.hsv.s)) {
      this.hsv.s = 1;
    }

    this.backUpHue = this.hsv.h;
    this.backUpSaturation = this.hsv.s;

    this.container.classList.add('tfe-color-picker');

    this.container.innerHTML = `
<div class="tfe-color-picker-root">
  <div class="tfe-color-picker-sl-picker" style="width: ${this.CANVAS_SIZE}px; height: ${this.CANVAS_SIZE}px">
    <canvas class="tfe-color-picker-sl-picker-canvas" width="${this.CANVAS_SIZE}" height="${this.CANVAS_SIZE}" />
  </div>
  <div class="tfe-color-picker-h-picker"  style="height: ${this.CANVAS_SIZE}px">
    <canvas class="tfe-color-picker-h-picker-canvas" width="18" height="${this.CANVAS_SIZE}" />
  </div>
  <form class="tfe-color-picker-input-root">
    <div class="tfe-color-preview" style="background: ${this.getHEX()}"></div>

    <div></div>
    <div></div>

    <label for="h">h:</label>
    <input class="tfe-color-picker-h-input" name="h" type="number" min="0" max="360" step="1" value="${this.hsv.h.toFixed(0)}">

    <label for="s">s:</label>
    <input class="tfe-color-picker-s-input" name="s" type="number" min="0" max="100" step="1" value="${(this.hsv.s * 100).toFixed(0)}">

    <label for="v">v:</label>
    <input class="tfe-color-picker-v-input" name="v" type="number" min="0" max="100" step="1" value="${(this.hsv.v * 100).toFixed(0)}">

    <div></div>
    <div></div>

    <label for="r">r:</label>
    <input class="tfe-color-picker-r-input" name="r" type="number" min="0" max="255" step="1" value="${this.hsv.rgb().r.toFixed(0)}">

    <label for="g">g:</label>
    <input class="tfe-color-picker-g-input" name="g" type="number" min="0" max="255" step="1" value="${this.hsv.rgb().g.toFixed(0)}">

    <label for="b">b:</label>
    <input class="tfe-color-picker-b-input" name="b" type="number" min="0" max="255" step="1" value="${this.hsv.rgb().b.toFixed(0)}">

    <div></div>
    <div></div>

    <label for="hex">hex:</label>
    <input class="tfe-color-picker-hex-input" name="hex" type="text" minlength="4" maxlength="7" value="${this.getHEX()}">
  </form>
</div>        
        `;

    this.svCanvas = this.container.querySelector<HTMLCanvasElement>('.tfe-color-picker-sl-picker-canvas');
    this.svContext = this.svCanvas.getContext('2d', {alpha: false});

    this.drawSVPicker();
    this.addSVEventListener();

    this.hCanvas = this.container.querySelector<HTMLCanvasElement>('.tfe-color-picker-h-picker-canvas');
    this.hContext = this.hCanvas.getContext('2d', {alpha: false});

    this.drawHPicker();
    this.addHEventListener();
    this.inputFields = {
      h: this.container.querySelector<HTMLInputElement>('.tfe-color-picker-h-input'),
      s: this.container.querySelector<HTMLInputElement>('.tfe-color-picker-s-input'),
      v: this.container.querySelector<HTMLInputElement>('.tfe-color-picker-v-input'),
      r: this.container.querySelector<HTMLInputElement>('.tfe-color-picker-r-input'),
      g: this.container.querySelector<HTMLInputElement>('.tfe-color-picker-g-input'),
      b: this.container.querySelector<HTMLInputElement>('.tfe-color-picker-b-input'),
      hex: this.container.querySelector<HTMLInputElement>('.tfe-color-picker-hex-input'),
    };
    this.addInputEventListeners();

    this.previewElement = this.container.querySelector<HTMLDivElement>('.tfe-color-preview');
  }

  public onChange(callback: (newColor: Color) => void) {
    this.callback = callback;
    const rgb = this.getRGB();
    const hsl = this.getHSL();
    const hsv = this.getHSV();
    this.callback({rgb, hsl, hsv, hex: this.getHEX()});
  }

  private sendUpdate() {
    const hex = this.getHEX();
    this.previewElement.style.backgroundColor = hex;

    if (this.callback) {
      const rgb = this.getRGB();
      const hsl = this.getHSL();
      const hsv = this.getHSV();
      this.callback({rgb, hsl, hsv, hex});
    }
  }

  public setHEX(color: string) {
    this.hsv = d3HSV(color);
    this.validateHueAndSaturation();
    this.sendUpdate();
    this.drawAll();
  }

  public setRGB(r: number, g: number, b: number) {
    this.hsv = d3HSV(`rgb(${r * 255},${g * 255},${b * 255})`);
    this.validateHueAndSaturation();
    this.sendUpdate();
    this.drawAll();
  }

  public setHSL(h: number, s: number, l: number) {
    this.hsv = d3HSV(`hsl(${h * 360} ${s * 100} ${l * 100})`);
    this.validateHueAndSaturation();
    this.sendUpdate();
    this.drawAll();
  }

  public setHSV(h: number, s: number, v: number) {
    this.hsv = d3HSV(h, s, v);
    this.validateHueAndSaturation();
    this.sendUpdate();
    this.drawAll();
  }

  public getHEX(): string {
    return this.formatHSV(this.hsv);
  }

  public getRGB(): RGB {
    const rgb = this.hsv.rgb();
    return {r: rgb.r, g: rgb.g, b: rgb.b};
  }

  public getHSL(): HSL {
    const hsl = d3HSL(this.hsv.formatHsl());
    return {h: hsl.h, s: hsl.s, l: hsl.l};
  }

  public getHSV(): HSV {
    return {h: this.hsv.h, s: this.hsv.s, v: this.hsv.v};
  }

  private drawAll() {
    this.drawHPicker();
    this.drawSVPicker();
  }

  private drawSVPicker() {
    for (let x = 0; x < this.CANVAS_SIZE; x++) {
      const gradient = this.svContext.createLinearGradient(0, 0, 0, this.CANVAS_SIZE);
      gradient.addColorStop(0, d3HSV(this.hsv.h, x / this.CANVAS_SIZE, 1).formatHex());
      gradient.addColorStop(1, d3HSV(this.hsv.h, x / this.CANVAS_SIZE, 0).formatHex());

      this.svContext.fillStyle = gradient;
      this.svContext.fillRect(x, 0, 1, this.CANVAS_SIZE);
    }

    const x = this.hsv.s * this.CANVAS_SIZE;
    const y = (1 - this.hsv.v) * this.CANVAS_SIZE;
    const strokes = 10;
    for (let i = 0; i < strokes; i++) {
      this.svContext.beginPath();
      this.svContext.strokeStyle = i % 2 === 0 ? 'white' : 'black';
      this.svContext.arc(
        x,
        y,
        this.controlPointSize,
        (i / strokes) * (2 * Math.PI),
        ((i + 1) / strokes) * (2 * Math.PI)
      );
      this.svContext.stroke();
    }
  }

  private drawHPicker() {
    const gradient = this.hContext.createLinearGradient(0, 0, 0, this.hCanvas.height);
    gradient.addColorStop(0 / 6, '#ff0000');
    gradient.addColorStop(1 / 6, '#ffff00');
    gradient.addColorStop(2 / 6, '#00ff00');
    gradient.addColorStop(3 / 6, '#00ffff');
    gradient.addColorStop(4 / 6, '#0000ff');
    gradient.addColorStop(5 / 6, '#ff00ff');
    gradient.addColorStop(6 / 6, '#ff0000');
    this.hContext.fillStyle = gradient;
    this.hContext.fillRect(0, 0, this.hCanvas.width, this.hCanvas.height);

    const x = this.hCanvas.width / 2;
    const y = (this.hsv.h / 360) * this.hCanvas.height;

    const strokes = 10;
    for (let i = 0; i < strokes; i++) {
      this.hContext.beginPath();
      this.hContext.strokeStyle = i % 2 === 0 ? 'white' : 'black';
      this.hContext.arc(
        x,
        y,
        this.controlPointSize,
        (i / strokes) * (2 * Math.PI),
        ((i + 1) / strokes) * (2 * Math.PI)
      );
      this.hContext.stroke();
    }
  }

  private addSVEventListener() {
    let isDragging = false;
    let abortController: AbortController = null;

    const updateSV = (x, y) => {
      this.hsv.s = clamp(x / this.CANVAS_SIZE, 0, 1);
      this.backUpSaturation = this.hsv.s;
      this.hsv.v = clamp(1 - y / this.CANVAS_SIZE, 0, 1);
      this.sendUpdate();

      this.drawSVPicker();
      this.updateHSVInputFields();
      this.updateRGBInputFields();
      this.updateHEXInputField();
    };

    this.svCanvas.addEventListener('mousedown', (e) => {
      abortController = new AbortController();
      document.addEventListener('mousemove', (e) => {
        e.preventDefault();
        updateSV(e.clientX - this.svCanvas.getBoundingClientRect().x, e.clientY - this.svCanvas.getBoundingClientRect().y);
      }, {signal: abortController.signal});

      isDragging = true;
      updateSV(e.offsetX, e.offsetY);
    });

    document.addEventListener('mouseup', (e) => {
      if (isDragging && abortController) {
        abortController.abort();
        abortController = null;
        isDragging = false;
      }
    });
  }

  private addHEventListener() {
    let isDragging = false;
    let abortController: AbortController = null;

    const updateH = (y) => {
      this.hsv.h = clamp(Math.round((y / this.CANVAS_SIZE) * 360), 0, 360);
      this.backUpHue = this.hsv.h;
      this.sendUpdate();
      this.drawAll();
      this.inputFields.h.valueAsNumber = Math.round(this.hsv.h);
      this.updateRGBInputFields();
      this.updateHEXInputField();
    };

    this.hCanvas.addEventListener('mousedown', (e) => {
      abortController = new AbortController();
      document.addEventListener('mousemove', (e) => {
        e.preventDefault();
        updateH(e.clientY - this.svCanvas.getBoundingClientRect().y);
      }, {signal: abortController.signal});


      isDragging = true;
      updateH(e.offsetY);
    });

    document.addEventListener('mouseup', (e) => {
      if (isDragging && abortController) {
        abortController.abort();
        abortController = null;
        isDragging = false;
      }
    });
  }

  private addInputEventListeners() {
    const validateInput = (element: HTMLInputElement, min: number, max: number): number | null => {
      if (element.valueAsNumber < min) {
        element.valueAsNumber = min;
      } else if (element.valueAsNumber > max) {
        element.valueAsNumber = max;
      }

      return Number.isFinite(element.valueAsNumber) ? element.valueAsNumber : null;
    };

    const validateFinal = (element: HTMLInputElement, min: number, max: number): number | null => {
      const value = validateInput(element, min, max);
      if (value === null) {
        element.valueAsNumber = min;
        return min;
      }
      return null;
    };

    this.inputFields.h.addEventListener('input', (ev: InputEvent) => {
      const value = validateInput(ev.currentTarget as HTMLInputElement, 0, 360);
      if (value !== null) {
        this.hsv.h = value;
        this.backUpHue = this.hsv.h;
        this.sendUpdate();
        this.drawAll();
        this.updateRGBInputFields();
        this.updateHEXInputField();
      }
    });

    const validateHField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = validateFinal(el, 0, 360);
      if (value !== null) {
        this.hsv.h = value;
        this.backUpHue = this.hsv.h;
        this.sendUpdate();
        this.drawAll();
        this.updateRGBInputFields();
        this.updateHEXInputField();
      }
    };

    this.inputFields.h.addEventListener('focusout', validateHField);
    this.inputFields.h.addEventListener('keypress', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        validateHField(ev);
      }
    });

    this.inputFields.s.addEventListener('input', (ev: InputEvent) => {
      const value = validateInput(ev.currentTarget as HTMLInputElement, 0, 100);
      if (value !== null) {
        this.hsv.s = value / 100;
        this.backUpSaturation = this.hsv.s;
        this.sendUpdate();
        this.drawSVPicker();
        this.updateRGBInputFields();
        this.updateHEXInputField();
      }
    });

    const validateSField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = validateFinal(el, 0, 100);
      if (value !== null) {
        this.hsv.s = value;
        this.backUpSaturation = this.hsv.s;
        this.sendUpdate();
        this.drawAll();
        this.updateRGBInputFields();
        this.updateHEXInputField();
      }
    };

    this.inputFields.s.addEventListener('focusout', validateSField);
    this.inputFields.s.addEventListener('keypress', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        validateSField(ev);
      }
    });

    this.inputFields.v.addEventListener('input', (ev: InputEvent) => {
      const value = validateInput(ev.currentTarget as HTMLInputElement, 0, 100);
      if (value !== null) {
        this.hsv.v = value / 100;
        this.sendUpdate();
        this.drawSVPicker();
        this.updateRGBInputFields();
        this.updateHEXInputField();
      }
    });

    const validateVField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = validateFinal(el, 0, 100);
      if (value !== null) {
        this.hsv.v = value;
        this.sendUpdate();
        this.drawAll();
        this.updateRGBInputFields();
        this.updateHEXInputField();
      }
    };

    this.inputFields.v.addEventListener('focusout', validateVField);
    this.inputFields.v.addEventListener('keypress', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        validateVField(ev);
      }
    });

    this.inputFields.r.addEventListener('input', (ev: InputEvent) => {
      const value = validateInput(ev.currentTarget as HTMLInputElement, 0, 255);
      if (value !== null) {
        const oldRGB = this.hsv.rgb();
        this.hsv = d3HSV(`rgb(${Math.round(value)},${Math.round(oldRGB.g)},${Math.round(oldRGB.b)})`);
        this.validateHueAndSaturation();
        this.sendUpdate();
        this.drawAll();
        this.updateHSVInputFields();
        this.updateHEXInputField();
      }
    });

    const validateRField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = validateFinal(el, 0, 255);
      if (value !== null) {
        const oldRGB = this.hsv.rgb();
        this.hsv = d3HSV(`rgb(${Math.round(value)},${Math.round(oldRGB.g)},${Math.round(oldRGB.b)})`);
        this.validateHueAndSaturation();
        this.sendUpdate();
        this.drawAll();
        this.updateHSVInputFields();
        this.updateHEXInputField();
      }
    };

    this.inputFields.r.addEventListener('focusout', validateRField);
    this.inputFields.r.addEventListener('keypress', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        validateRField(ev);
      }
    });

    this.inputFields.g.addEventListener('input', (ev: InputEvent) => {
      const value = validateInput(ev.currentTarget as HTMLInputElement, 0, 255);
      if (value !== null) {
        const oldRGB = this.hsv.rgb();
        this.hsv = d3HSV(`rgb(${Math.round(oldRGB.r)},${Math.round(value)},${Math.round(oldRGB.b)})`);
        this.validateHueAndSaturation();
        this.sendUpdate();
        this.drawAll();
        this.updateHSVInputFields();
        this.updateHEXInputField();
      }
    });

    const validateGField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = validateFinal(el, 0, 255);
      if (value !== null) {
        const oldRGB = this.hsv.rgb();
        this.hsv = d3HSV(`rgb(${Math.round(oldRGB.r)},${Math.round(value)},${Math.round(oldRGB.b)})`);
        this.validateHueAndSaturation();
        this.sendUpdate();
        this.drawAll();
        this.updateHSVInputFields();
        this.updateHEXInputField();
      }
    };

    this.inputFields.g.addEventListener('focusout', validateGField);
    this.inputFields.g.addEventListener('keypress', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        validateGField(ev);
      }
    });

    this.inputFields.b.addEventListener('input', (ev: InputEvent) => {
      const value = validateInput(ev.currentTarget as HTMLInputElement, 0, 255);
      if (value !== null) {
        const oldRGB = this.hsv.rgb();
        this.hsv = d3HSV(`rgb(${Math.round(oldRGB.r)},${Math.round(oldRGB.g)},${Math.round(value)})`);
        this.validateHueAndSaturation();
        this.sendUpdate();
        this.drawAll();
        this.updateHSVInputFields();
        this.updateHEXInputField();
      }
    });

    const validateBField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = validateFinal(el, 0, 255);
      if (value !== null) {
        const oldRGB = this.hsv.rgb();
        this.hsv = d3HSV(`rgb(${Math.round(oldRGB.r)},${Math.round(oldRGB.g)},${Math.round(value)})`);
        this.validateHueAndSaturation();
        this.sendUpdate();
        this.drawAll();
        this.updateHSVInputFields();
        this.updateHEXInputField();
      }
    };

    this.inputFields.b.addEventListener('focusout', validateBField);
    this.inputFields.b.addEventListener('keypress', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        validateBField(ev);
      }
    });

    this.inputFields.hex.addEventListener('input', (ev: InputEvent) => {
      const element = ev.currentTarget as HTMLInputElement;
      const value = element.value;
      if (value.match(/#([0-7a-fA-F]{3}$|[0-7a-fA-F]{6}$)/)) {
        this.hsv = d3HSV(value);
        this.validateHueAndSaturation();
        this.sendUpdate();
        this.drawAll();
        this.updateRGBInputFields();
        this.updateHSVInputFields();
        element.classList.remove('tfe-color-picker-input-hex-invalid');
      } else {
        element.classList.add('tfe-color-picker-input-hex-invalid');
      }
    });

    this.inputFields.hex.addEventListener('focusout', (ev: InputEvent) => {
      const element = ev.currentTarget as HTMLInputElement;
      const value = element.value;
      if (!value.match(/#([0-7a-fA-F]{3}$|[0-7a-fA-F]{6}$)/)) {
        element.value = this.getHEX();
        element.classList.remove('tfe-color-picker-input-hex-invalid');
      }
    });
  }

  private updateHSVInputFields() {
    this.inputFields.h.valueAsNumber = clamp(Math.round(this.hsv.h), 0, 360);
    this.inputFields.s.valueAsNumber = clamp(Math.round(this.hsv.s * 100), 0, 100);
    this.inputFields.v.valueAsNumber = clamp(Math.round(this.hsv.v * 100), 0, 100);
  }

  private updateRGBInputFields() {
    const rgb = this.hsv.rgb();
    this.inputFields.r.valueAsNumber = clamp(Math.round(rgb.r), 0, 255);
    this.inputFields.g.valueAsNumber = clamp(Math.round(rgb.g), 0, 255);
    this.inputFields.b.valueAsNumber = clamp(Math.round(rgb.b), 0, 255);
  }

  private updateHEXInputField() {
    this.inputFields.hex.value = this.getHEX();
  }

  private validateHueAndSaturation() {
    if (Number.isNaN(this.hsv.h)) {
      this.hsv.h = this.backUpHue;
    } else {
      this.backUpHue = this.hsv.h;
    }

    if (Number.isNaN(this.hsv.s)) {
      this.hsv.s = this.backUpSaturation;
    } else {
      this.backUpSaturation = this.hsv.s;
    }
  }

  private formatHSV(hsv: HSVColor): string {
    return d3HSL(hsv.toString()).formatHex();
  }
}

function clamp(number, min, max): number {
  return Math.max(min, Math.min(max, number));
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

interface Color {
  rgb: RGB;
  hsl: HSL;
  hsv: HSV;
  hex: string;
}
