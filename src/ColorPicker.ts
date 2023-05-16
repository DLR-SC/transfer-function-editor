import {hsl as d3HSL} from 'd3-color';
import {hsv as d3HSV, HSVColor} from 'd3-hsv';
import {drawControlPoint} from './draw';
import Container from './Container';
import NumberInputField from './NumberInputField';

/**
 * This creates a color picker component, that will be embedded in the given container. The color can be chosen with a
 * hue, saturation and value picker, or by text fields for hsv, rgb and hex values. This might be more configurable in
 * the future.
 *
 * @example
 * ```js
 *   const cp = new ColorPicker("#color-picker-container", { initialColor: "cyan" });
 *
 *   cp.addListener((colorPicker) => {
 *     console.log("rgb: ", colorPicker.getRGB()); // rgb: { r: 0, g: 255, b: 255 }
 *     console.log("hsv: ", colorPicker.getHSV()); // hsv: { r: 180, g: 100, b: 50 }
 *     console.log("hsl: ", colorPicker.getHSL()); // hsl: { h: 180, s: 100, l: 100 }
 *
 *     console.log("rgb: ", colorPicker.getRGBNormalized()); // rgb: { r: 0.0, g: 1.0, b: 1.0 }
 *     console.log("hsv: ", colorPicker.getHSVNormalized()); // hsv: { r: 0.5, g: 1.0, b: 0.5 }
 *     console.log("hsl: ", colorPicker.getHSLNormalized()); // hsl: { h: 0.5, s: 1.0, l: 1.0 }
 *     console.log("hex: ", colorPicker.getHEX()); // hex: "#00ffff"
 *   });
 * ```
 */
export class ColorPicker extends Container {
  /** This is the internal color state. We chose hsv as a fitting internal representation. */
  private hsv: HSVColor;

  /**
   * If a color on the black-grey-white spectrum is selected the hue becomes undefined. This field saves the last valid
   * hue state to ensure that the hue value doesn't vanish.
   */
  private backUpHue;

  /**
   * If the value is zero, the saturation becomes undefined. This field saves the last valid saturation state to ensure
   * that the saturation value doesn't vanish.
   */
  private backUpSaturation;

  /** The saturation and value picker is painted in this canvas. It also handles mouse input. */
  private readonly svCanvas: HTMLCanvasElement;

  /** The context to the svCanvas for convenience. */
  private svContext: CanvasRenderingContext2D;

  /** The hue picker is painted in this canvas. It also handles mouse input. */
  private readonly hCanvas: HTMLCanvasElement;

  /** The context to the hCanvas for convenience. */
  private hContext: CanvasRenderingContext2D;

  /** The default dimensions of the color picker components. Might become configurable in the future. */
  private readonly CANVAS_SIZE: number = 256;

  /** The size of the control points. Might become configurable in the future. */
  private controlPointSize: number = 7;

  /** This gets called, when the color changes to notify users of this library. */
  private callbacks: Map<number, ColorCallback> = new Map();
  private callbackCounter = 0;

  /** All the inputs for manual editing the hsv, rgb and hex values. */
  private inputFields: {
    h: NumberInputField;
    s: NumberInputField;
    v: NumberInputField;
    r: NumberInputField;
    g: NumberInputField;
    b: NumberInputField;
    hex: HTMLInputElement;
  };

  /** Displays the resulting color. */
  private previewElement: HTMLDivElement;

  /**
   * Creates a new color picker inside the given container.
   *
   * @param container Either an HTMLElement or a query string to an element, in which the color picker will be embedded.
   * @param options   Can be used to configure the color picker. See {@link ColorPickerOptions}.
   */
  constructor(container: HTMLElement | string, options?: ColorPickerOptions) {
    super(container);

    // Set all defaults.
    const defaultOptions: ColorPickerOptions = {
      initialColor: '#FFF',
    };

    // Merge the options with the defaults.
    // !!! DON'T USE options AND defaultOptions AFTER THIS LINE !!!
    const finalOptions = Object.assign(defaultOptions, options);

    this.hsv = d3HSV(finalOptions.initialColor);
    if (Number.isNaN(this.hsv.h)) {
      this.hsv.h = 180;
    }

    if (Number.isNaN(this.hsv.s)) {
      this.hsv.s = 1;
    }

    this.backUpHue = this.hsv.h;
    this.backUpSaturation = this.hsv.s;

    // Fill the given container with all the HTML and CSS that we need.
    this.parent.classList.add('tfe-color-picker');
    this.parent.innerHTML = `
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
          <div class="tfe-color-picker-h-input"></div>
          <div class="tfe-color-picker-s-input"></div>
          <div class="tfe-color-picker-v-input"></div>
          <div></div>
          <div class="tfe-color-picker-r-input"></div>
          <div class="tfe-color-picker-g-input"></div>
          <div class="tfe-color-picker-b-input"></div>
          <div></div>
          <label>hex:
            <input class="tfe-color-picker-hex-input" type="text" minlength="4" maxlength="7" value="${this.getHEX()}">
          </label>
        </form>
      </div>
    `;

    // Prepare the canvas and context for the saturation and value picker.
    this.svCanvas = this.parent.querySelector<HTMLCanvasElement>('.tfe-color-picker-sl-picker-canvas');
    this.svContext = this.svCanvas.getContext('2d', {alpha: false});
    this.drawSVPicker();
    this.addSVEventListener();

    // Prepare the canvas and context for the hue picker.
    this.hCanvas = this.parent.querySelector<HTMLCanvasElement>('.tfe-color-picker-h-picker-canvas');
    this.hCanvas.style.background = 'linear-gradient(#f00, #f0f, #00f, #0ff, #0f0, #ff0, #f00)';

    this.hContext = this.hCanvas.getContext('2d', {alpha: true});
    this.drawHPicker();
    this.addHEventListener();

    // Get the preview element.
    this.previewElement = this.parent.querySelector<HTMLDivElement>('.tfe-color-preview');

    // Initialize all input fields.
    this.inputFields = {
      h: new NumberInputField(this.parent.querySelector<HTMLDivElement>('.tfe-color-picker-h-input'), {
        label: 'h: ',
        min: 0,
        max: 360,
        initialValue: this.hsv.h,
      }),
      s: new NumberInputField(this.parent.querySelector<HTMLDivElement>('.tfe-color-picker-s-input'), {
        label: 's: ',
        min: 0,
        max: 100,
        initialValue: this.hsv.s * 100,
      }),
      v: new NumberInputField(this.parent.querySelector<HTMLDivElement>('.tfe-color-picker-v-input'), {
        label: 'v: ',
        min: 0,
        max: 100,
        initialValue: this.hsv.v * 100,
      }),

      r: new NumberInputField(this.parent.querySelector<HTMLDivElement>('.tfe-color-picker-r-input'), {
        label: 'r: ',
        min: 0,
        max: 255,
        initialValue: this.hsv.rgb().r,
      }),
      g: new NumberInputField(this.parent.querySelector<HTMLDivElement>('.tfe-color-picker-g-input'), {
        label: 'g: ',
        min: 0,
        max: 255,
        initialValue: this.hsv.rgb().g,
      }),
      b: new NumberInputField(this.parent.querySelector<HTMLDivElement>('.tfe-color-picker-b-input'), {
        label: 'b: ',
        min: 0,
        max: 255,
        initialValue: this.hsv.rgb().b,
      }),

      hex: this.parent.querySelector<HTMLInputElement>('.tfe-color-picker-hex-input'),
    };
    this.addInputEventListeners();
  }

  /**
   * Register a callback that gets called, when a new color is picked. The callback gets called once immediately.
   *
   * @param callback The function that gets called whenever the color changes.
   */
  public addListener(callback: ColorCallback): number {
    const id = this.callbackCounter++;
    this.callbacks.set(id, callback);
    callback(this);
    return id;
  }

  /** Removes the listener with the given id. */
  public removeListener(id: number) {
    this.callbacks.delete(id);
  }

  /**
   * Sets a new color for the color picker in HEX format. Theoretically all valid CSS color strings can be given
   * here, but for consistency with other function names we keep the name as is.
   */
  public setHEX(color: string) {
    this.hsv = d3HSV(color);
    this.validateHueAndSaturation();
    this.sendUpdate();
    this.updateAll();
  }

  /** Sets a new color for the color picker in RGB format. The given values must be in the range of 0 - 255. */
  public setRGB(r: number, g: number, b: number) {
    this.hsv = d3HSV(`rgb(${r},${g},${b})`);
    this.validateHueAndSaturation();
    this.sendUpdate();
    this.updateAll();
  }

  /** Sets a new color for the color picker in RGB format. The given values must be in the range of 0.0 - 1.0. */
  public setRGBNormalized(r: number, g: number, b: number) {
    this.setRGB(r * 255, g * 255, b * 255);
  }

  /**
   * Sets a new color for the color picker in HSL format. The given values must be in the range of 0 - 360 for h and
   * 0 - 100 for s and l.
   */
  public setHSL(h: number, s: number, l: number) {
    this.hsv = d3HSV(`hsl(${h} ${s} ${l})`);
    this.validateHueAndSaturation();
    this.sendUpdate();
    this.updateAll();
  }

  /** Sets a new color for the color picker in HSL format. The given values must be in the range of 0.0 - 1.0. */
  public setHSLNormalized(h: number, s: number, l: number) {
    this.setHSL(h * 360, s * 100, l * 100);
  }

  /**
   * Sets a new color for the color picker in HSV format. The given values must be in the range of 0 - 360 for h and
   * 0 - 100 for s and v.
   */
  public setHSV(h: number, s: number, v: number) {
    this.hsv = d3HSV(h, s, v);
    this.validateHueAndSaturation();
    this.sendUpdate();
    this.updateAll();
  }

  /** Sets a new color for the color picker in HSV format. The given values must be in the range of 0.0 - 1.0. */
  public setHSVNormalized(h: number, s: number, v: number) {
    this.setHSV(h * 360, s * 100, v * 100);
  }

  /** Returns the currently selected color in HEX format. */
  public getHEX(): string {
    return this.hsv.formatHex();
  }

  /** Returns the currently selected color on RGB format with values between 0 - 255. */
  public getRGB(): RGB {
    const rgb = this.hsv.rgb();
    return {r: rgb.r, g: rgb.g, b: rgb.b};
  }

  /** Returns the currently selected color on RGB format with values between 0.0 - 1.0. */
  public getRGBNormalized(): RGB {
    const rgb = this.hsv.rgb();
    return {r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255};
  }

  /** Returns the currently selected color on HSL format with values between 0 - 360 for h and 0 - 100 for s and l. */
  public getHSL(): HSL {
    const hsl = d3HSL(this.hsv.formatHsl());
    return {h: hsl.h, s: hsl.s * 100, l: hsl.l * 100};
  }

  /** Returns the currently selected color on HSL format with values between 0.0 - 1.0. */
  public getHSLNormalized(): HSL {
    const hsl = d3HSL(this.hsv.formatHsl());
    return {h: hsl.h / 360, s: hsl.s, l: hsl.l};
  }

  /** Returns the currently selected color on HSV format with values between 0 - 360 for h and 0 - 100 for s and v. */
  public getHSV(): HSV {
    return {h: this.hsv.h, s: this.hsv.s * 100, v: this.hsv.v * 100};
  }

  /** Returns the currently selected color on HSV format with values between 0.0 - 1.0. */
  public getHSVNormalized(): HSV {
    return {h: this.hsv.h / 360, s: this.hsv.s, v: this.hsv.v};
  }

  /**
   * Returns a collection of all different color representations of the currently selected color. RGB values are in the
   * range 0 - 255, hue is in the range 0 - 360, saturation, value and lightness are in the range 0 - 100.
   */
  public getColor(): Color {
    const rgb = this.getRGB();
    const hsl = this.getHSL();
    const hsv = this.getHSV();
    const hex = this.getHEX();
    return {rgb, hsl, hsv, hex};
  }

  /**
   * Returns a collection of all different color representations of the currently selected color. All numerical values
   * are in the range 0.0 - 1.0.
   */
  public getColorNormalized(): Color {
    const rgb = this.getRGBNormalized();
    const hsl = this.getHSLNormalized();
    const hsv = this.getHSVNormalized();
    const hex = this.getHEX();
    return {rgb, hsl, hsv, hex};
  }

  /**
   * This function should be called everytime the color changes. It triggers the callback and sets the color of the
   * preview element.
   */
  private sendUpdate() {
    this.previewElement.style.backgroundColor = this.getHEX();
    this.callbacks.forEach((callback) => {
      callback(this);
    });
  }

  /** Draws the canvases and updates the input fields. */
  private updateAll() {
    this.drawAll();
    this.updateInputFields();
  }

  /** Draws the saturation-value picker and the hue picker. */
  private drawAll() {
    this.drawHPicker();
    this.drawSVPicker();
  }

  /** Draws the saturation-value picker. */
  private drawSVPicker() {
    // We draw the saturation value picker in three steps:

    // 1. Draw the current hue with full saturation and value as the backgrund color.
    this.svContext.fillStyle = d3HSV(this.hsv.h, 1, 1).formatHex();
    this.svContext.fillRect(0, 0, this.CANVAS_SIZE, this.CANVAS_SIZE);

    // 2. Draw a white to transparent gradient for the saturation from left to right.
    const saturationGradient = this.svContext.createLinearGradient(
      0,
      this.CANVAS_SIZE / 2,
      this.CANVAS_SIZE,
      this.CANVAS_SIZE / 2
    );
    saturationGradient.addColorStop(0, 'rgb(255, 255, 255)');
    saturationGradient.addColorStop(1, 'rgb(255, 255, 255, 0)');
    this.svContext.fillStyle = saturationGradient;
    this.svContext.fillRect(0, 0, this.CANVAS_SIZE, this.CANVAS_SIZE);

    // 3. Draw a black to transparent gradient for the value from bottom to top.
    const valueGradient = this.svContext.createLinearGradient(
      this.CANVAS_SIZE / 2,
      this.CANVAS_SIZE,
      this.CANVAS_SIZE / 2,
      0
    );
    valueGradient.addColorStop(0, 'rgb(0, 0, 0)');
    valueGradient.addColorStop(1, 'rgb(0, 0, 0, 0)');
    this.svContext.fillStyle = valueGradient;
    this.svContext.fillRect(0, 0, this.CANVAS_SIZE, this.CANVAS_SIZE);

    // Draw the control point. To ensure visibility everywhere it is an alternating circle in white and black.
    const x = this.hsv.s * this.CANVAS_SIZE;
    const y = (1 - this.hsv.v) * this.CANVAS_SIZE;
    drawControlPoint(this.svContext, x, y, this.controlPointSize);
  }

  /** Draws the hue picker. */
  private drawHPicker() {
    // Draw the hue gradient.
    this.hContext.clearRect(0, 0, this.hCanvas.width, this.hCanvas.height);

    // Draw the control point. To ensure visibility everywhere it is an alternating circle in white and black.
    const x = this.hCanvas.width / 2;
    const y = (1 - this.hsv.h / 360) * this.hCanvas.height;
    drawControlPoint(this.hContext, x, y, this.controlPointSize);
  }

  /** Adds all the mouse input events for moving the control point of the saturation-value picker around. */
  private addSVEventListener() {
    let isDragging = false;
    let abortController: AbortController = null;

    // Gets called when a new value was selected with the mouse.
    const updateSV = (x, y) => {
      // Calculate new values from mouse position.
      this.hsv.s = clamp(x / this.CANVAS_SIZE, 0, 1);
      this.backUpSaturation = this.hsv.s;
      this.hsv.v = clamp(1 - y / this.CANVAS_SIZE, 0, 1);

      // Send an update to the user.
      this.sendUpdate();

      // Update other relevant components.
      this.drawSVPicker();
      this.updateHSVInputFields();
      this.updateRGBInputFields();
      this.updateHEXInputField();
    };

    // When the left mouse button is pressed we attach a mouse move listener to the document to track the mouse movement
    // even outside the canvas.
    this.svCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        abortController = new AbortController();
        document.addEventListener(
          'mousemove',
          (e) => {
            e.preventDefault();
            updateSV(
              e.clientX - this.svCanvas.getBoundingClientRect().x,
              e.clientY - this.svCanvas.getBoundingClientRect().y
            );
          },
          {signal: abortController.signal}
        );

        isDragging = true;
        updateSV(e.offsetX, e.offsetY);
      }
    });

    // Stop the drag tracking and remove the move listener from the document.
    document.addEventListener('mouseup', () => {
      if (isDragging && abortController) {
        abortController.abort();
        abortController = null;
        isDragging = false;
      }
    });
  }

  /** Adds all the mouse input events for moving the control point of the hue picker around. */
  private addHEventListener() {
    let isDragging = false;
    let abortController: AbortController = null;

    // Gets called when a new value was selected with the mouse.
    const updateH = (y) => {
      // Calculate the new value from the mouse position.
      this.hsv.h = clamp(Math.round((1 - y / this.CANVAS_SIZE) * 360), 0, 360);
      this.backUpHue = this.hsv.h;

      // Send an update to the user.
      this.sendUpdate();

      // Update other relevant components.
      this.drawAll();
      this.inputFields.h.setValue(this.hsv.h);
      this.updateRGBInputFields();
      this.updateHEXInputField();
    };

    // When the left mouse button is pressed we attach a mouse move listener to the document to track the mouse movement
    // even outside the canvas.
    this.hCanvas.addEventListener('mousedown', (e) => {
      abortController = new AbortController();
      document.addEventListener(
        'mousemove',
        (e) => {
          e.preventDefault();
          updateH(e.clientY - this.svCanvas.getBoundingClientRect().y);
        },
        {signal: abortController.signal}
      );

      isDragging = true;
      updateH(e.offsetY);
    });

    // Stop the drag tracking and remove the move listener from the document.
    document.addEventListener('mouseup', () => {
      if (isDragging && abortController) {
        abortController.abort();
        abortController = null;
        isDragging = false;
      }
    });
  }

  /** Adds all the listeners to the text input fields. It also adds validation, so the values are always valid. */
  private addInputEventListeners() {
    this.setupNumberInputListeners();
    this.setupHEXListeners();
  }

  /** Sets up all listeners for the HSV and RGB input fields. */
  private setupNumberInputListeners() {
    // Serves to prevent cyclic updates.
    let updateInProgress = false;

    const onHSVUpdate = () => {
      if (!updateInProgress) {
        updateInProgress = true;
        this.sendUpdate();
        this.drawAll();
        this.updateRGBInputFields();
        this.updateHEXInputField();
        updateInProgress = false;
      }
    };

    const onRGBUpdate = (r, g, b) => {
      if (!updateInProgress) {
        updateInProgress = true;
        this.hsv = d3HSV(`rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`);
        this.validateHueAndSaturation();
        this.sendUpdate();
        this.drawAll();
        this.updateHSVInputFields();
        this.updateHEXInputField();
        updateInProgress = false;
      }
    };

    // hsv

    this.inputFields.h.addListener((value) => {
      if (value !== this.hsv.h) {
        this.hsv.h = value;
        this.backUpHue = value;
        onHSVUpdate();
      }
    });

    this.inputFields.s.addListener((value) => {
      if (value !== this.hsv.s) {
        this.hsv.s = value / 100;
        this.backUpSaturation = this.hsv.s;
        onHSVUpdate();
      }
    });

    this.inputFields.v.addListener((value) => {
      if (value !== this.hsv.v) {
        this.hsv.v = value / 100;
        onHSVUpdate();
      }
    });

    // rgb

    this.inputFields.r.addListener((value) => {
      const oldRGB = this.hsv.rgb();
      if (value !== oldRGB.r) {
        onRGBUpdate(value, oldRGB.g, oldRGB.b);
      }
    });

    this.inputFields.g.addListener((value) => {
      const oldRGB = this.hsv.rgb();
      if (value !== oldRGB.g) {
        onRGBUpdate(oldRGB.r, value, oldRGB.b);
      }
    });

    this.inputFields.b.addListener((value) => {
      const oldRGB = this.hsv.rgb();
      if (value !== oldRGB.b) {
        onRGBUpdate(oldRGB.r, oldRGB.g, value);
      }
    });
  }

  /** Sets up all listeners for the HEX input field. */
  private setupHEXListeners() {
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

  /** Updates the text in all input fields. */
  private updateInputFields() {
    this.updateHSVInputFields();
    this.updateRGBInputFields();
    this.updateHEXInputField();
  }

  /** Updates the text inside the hsv input fields. */
  private updateHSVInputFields() {
    this.inputFields.h.setValue(this.hsv.h, false);
    this.inputFields.s.setValue(this.hsv.s * 100, false);
    this.inputFields.v.setValue(this.hsv.v * 100, false);
  }

  /** Updates the text inside the rgb input fields. */
  private updateRGBInputFields() {
    const rgb = this.hsv.rgb();
    this.inputFields.r.setValue(rgb.r, false);
    this.inputFields.g.setValue(rgb.g, false);
    this.inputFields.b.setValue(rgb.b, false);
  }

  /** Updates the text inside the hex input field. */
  private updateHEXInputField() {
    this.inputFields.hex.value = this.getHEX();
  }

  /**
   * Some colors have arbitrary hue or saturation values. We would like to show the last valid value in that case. This
   * function ensures that this always is true. It must be called everytime the hsv field is updated.
   */
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
}

/**
 * The config options for the {@link ColorPicker} component.
 */
export interface ColorPickerOptions {
  /**
   * The initially selected color.
   * Default: '#FFF'
   */
  initialColor?: string;
}

/** Simple utility to clamp a number between two values. */
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

type ColorCallback = (colorPicker: ColorPicker) => void;

// Add a stylesheet to the header, that contains the base layout of the color picker.
if (document.head.querySelector('#tfe-color-picker-style') === null) {
  document.head.insertAdjacentHTML(
    'beforeend',
    `
    <style id="tfe-color-picker-style">
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
        border: 1px solid grey;
        border-radius: 25px;
      }
    
      .tfe-color-picker-input-root > label {
        text-align: right;
      }
    
      .tfe-color-picker-input-root input {
        width: 60px;
        text-align: right;
        font-family: monospace;
      }
    
      .tfe-color-picker-input-hex-invalid:focus-visible {
        outline-color: red;
      }
    </style>`
  );
}
