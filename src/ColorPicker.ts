import { hsl as d3HSL } from "d3-color";
import { hsv as d3HSV, HSVColor } from "d3-hsv";

/**
 * This creates a color picker component, that will be embedded in the given container. The color can be chosen with a
 * hue, saturation and value picker, or by text fields for hsv, rgb and hex values. This might be more configurable in
 * the future.
 *
 * @example
 * ```js
 *   const cp = new ColorPicker("#color-picker-container", { initialColor: "cyan" });
 *
 *   cp.onChange((newColor) => {
 *     console.log("rgb: ", newColor.rgb); // rgb: { r: 0, g: 255, b: 255 }
 *     console.log("hsv: ", newColor.hsv); // hsv: { r: 180, g: 100, b: 50 }
 *     console.log("hsl: ", newColor.hsl); // hsl: { h: 180, s: 100, l: 100 }
 *     console.log("hex: ", newColor.hex); // hex: "#00ffff"
 *   });
 * ```
 */
export class ColorPicker {
  /** The root element, in which the color picker gets embedded. */
  private container: HTMLElement;

  /** This is the internal color state. We chose hsv as a fitting internal representation. */
  private hsv: HSVColor;

  /**
   * If a color on the black-grey-white spectrum is selected the hue becomes undefined. This field saves, the last valid
   * hue state, to ensure that the hue value doesn't vanish.
   */
  private backUpHue;

  /**
   * If the value is zero, the saturation becomes undefined. This field saves, the last valid saturation state, to
   * ensure that the saturation value doesn't vanish.
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
  private callback: (newColor: Color) => void;

  /** This determines, if the callback receives colors in normalized space (0.0 - 1.0). */
  private normalizedCallback: boolean;

  /** All the HTMLElements for manual editing the hsv, rgb and hex values. */
  private inputFields: {
    h: HTMLInputElement;
    s: HTMLInputElement;
    v: HTMLInputElement;
    r: HTMLInputElement;
    g: HTMLInputElement;
    b: HTMLInputElement;
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
    // Figure out which element we want to embed in.
    if (container) {
      if (typeof container === "string") {
        this.container = document.querySelector(container);
      } else {
        this.container = container;
      }
    } else {
      throw "No element given!";
    }

    // Set all defaults.
    const defaultOptions: ColorPickerOptions = {
      initialColor: "#FFF"
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
    this.container.classList.add("tfe-color-picker");
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

    // Prepare the canvas and context for the saturation and value picker.
    this.svCanvas = this.container.querySelector<HTMLCanvasElement>(".tfe-color-picker-sl-picker-canvas");
    this.svContext = this.svCanvas.getContext("2d", { alpha: false });
    this.drawSVPicker();
    this.addSVEventListener();

    // Prepare the canvas and context for the hue picker.
    this.hCanvas = this.container.querySelector<HTMLCanvasElement>(".tfe-color-picker-h-picker-canvas");
    this.hContext = this.hCanvas.getContext("2d", { alpha: false });
    this.drawHPicker();
    this.addHEventListener();

    // Initialize all text input fields.
    this.inputFields = {
      h: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-h-input"),
      s: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-s-input"),
      v: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-v-input"),
      r: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-r-input"),
      g: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-g-input"),
      b: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-b-input"),
      hex: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-hex-input")
    };
    this.addInputEventListeners();

    // Get the preview element.
    this.previewElement = this.container.querySelector<HTMLDivElement>(".tfe-color-preview");
  }

  /**
   * Register a callback that gets called, when a new color is picked.
   *
   * @param callback   The function that gets called whenever the color changes.
   * @param normalized If true, the callback receives colors in normalized (0.0 - 1.0) form.
   */
  public onChange(callback: (newColor: Color) => void, normalized: boolean = false) {
    this.normalizedCallback = normalized;
    this.callback = callback;
    this.callback(normalized ? this.getColorNormalized() : this.getColor());
  }

  /**
   * Sets a new color for the color picker in HEX format. Theoretically all valid CSS color strings are can be read in
   * here, but for consistency with other function names we keep the name as is.
   */
  public setHEX(color: string) {
    this.hsv = d3HSV(color);
    this.validateHueAndSaturation();
    this.sendUpdate();
    this.drawAll();
  }

  /** Sets a new color for the color picker in RGB format. The given values must be in the range of 0 - 255. */
  public setRGB(r: number, g: number, b: number) {
    this.hsv = d3HSV(`rgb(${r},${g},${b})`);
    this.validateHueAndSaturation();
    this.sendUpdate();
    this.drawAll();
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
    this.drawAll();
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
    this.drawAll();
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
    return { r: rgb.r, g: rgb.g, b: rgb.b };
  }

  /** Returns the currently selected color on RGB format with values between 0.0 - 1.0. */
  public getRGBNormalized(): RGB {
    const rgb = this.hsv.rgb();
    return { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 };
  }

  /** Returns the currently selected color on HSL format with values between 0 - 360 for h and 0 - 100 for s and l. */
  public getHSL(): HSL {
    const hsl = d3HSL(this.hsv.formatHsl());
    return { h: hsl.h, s: hsl.s * 100, l: hsl.l * 100 };
  }

  /** Returns the currently selected color on HSL format with values between 0.0 - 1.0. */
  public getHSLNormalized(): HSL {
    const hsl = d3HSL(this.hsv.formatHsl());
    return { h: hsl.h / 360, s: hsl.s, l: hsl.l };
  }

  /** Returns the currently selected color on HSV format with values between 0 - 360 for h and 0 - 100 for s and v. */
  public getHSV(): HSV {
    return { h: this.hsv.h, s: this.hsv.s * 100, v: this.hsv.v * 100 };
  }

  /** Returns the currently selected color on HSV format with values between 0.0 - 1.0. */
  public getHSVNormalized(): HSV {
    return { h: this.hsv.h / 360, s: this.hsv.s, v: this.hsv.v };
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
    return { rgb, hsl, hsv, hex };
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
    return { rgb, hsl, hsv, hex };
  }

  /**
   * This function should be called everytime the color change. It triggers the callback and sets the color of the
   * preview element.
   */
  private sendUpdate() {
    this.previewElement.style.backgroundColor = this.getHEX();

    if (this.callback) {
      this.callback(this.normalizedCallback ? this.getColorNormalized() : this.getColor());
    }
  }

  /** Draws the saturation-value picker and the hue picker. */
  private drawAll() {
    this.drawHPicker();
    this.drawSVPicker();
  }

  /** Draws the saturation-value picker. */
  private drawSVPicker() {
    // This draws the hsv gradient line by line.
    for (let y = 0; y < this.CANVAS_SIZE; y++) {
      const gradient = this.svContext.createLinearGradient(0, 0, this.CANVAS_SIZE, 0);
      gradient.addColorStop(0, d3HSV(this.hsv.h, 0, 1 - y / this.CANVAS_SIZE).formatHex());
      gradient.addColorStop(1, d3HSV(this.hsv.h, 1, 1 - y / this.CANVAS_SIZE).formatHex());

      this.svContext.fillStyle = gradient;
      this.svContext.fillRect(0, y, this.CANVAS_SIZE, 1);
    }

    // Draw the control point. To ensure visibility everywhere it is an alternating circle in white and black.
    const x = this.hsv.s * this.CANVAS_SIZE;
    const y = (1 - this.hsv.v) * this.CANVAS_SIZE;
    const strokes = 10;
    for (let i = 0; i < strokes; i++) {
      this.svContext.beginPath();
      this.svContext.strokeStyle = i % 2 === 0 ? "white" : "black";
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

  /** Draws the hue picker. */
  private drawHPicker() {
    // Draw the hue gradient.
    const gradient = this.hContext.createLinearGradient(0, 0, 0, this.hCanvas.height);
    gradient.addColorStop(0 / 6, "#ff0000");
    gradient.addColorStop(1 / 6, "#ff00ff");
    gradient.addColorStop(2 / 6, "#0000ff");
    gradient.addColorStop(3 / 6, "#00ffff");
    gradient.addColorStop(4 / 6, "#00ff00");
    gradient.addColorStop(5 / 6, "#ffff00");
    gradient.addColorStop(6 / 6, "#ff0000");
    this.hContext.fillStyle = gradient;
    this.hContext.fillRect(0, 0, this.hCanvas.width, this.hCanvas.height);

    // Draw the control point. To ensure visibility everywhere it is an alternating circle in white and black.
    const x = this.hCanvas.width / 2;
    const y = (1 - (this.hsv.h / 360)) * this.hCanvas.height;
    const strokes = 10;
    for (let i = 0; i < strokes; i++) {
      this.hContext.beginPath();
      this.hContext.strokeStyle = i % 2 === 0 ? "white" : "black";
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
    this.svCanvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        abortController = new AbortController();
        document.addEventListener("mousemove", (e) => {
          e.preventDefault();
          updateSV(e.clientX - this.svCanvas.getBoundingClientRect().x, e.clientY - this.svCanvas.getBoundingClientRect().y);
        }, { signal: abortController.signal });

        isDragging = true;
        updateSV(e.offsetX, e.offsetY);
      }
    });

    // Stop the drag tracking and remove the move listener from the document.
    document.addEventListener("mouseup", () => {
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
      this.hsv.h = clamp(Math.round((1 - (y / this.CANVAS_SIZE)) * 360), 0, 360);
      this.backUpHue = this.hsv.h;

      // Send an update to the user.
      this.sendUpdate();

      // Update other relevant components.
      this.drawAll();
      this.inputFields.h.valueAsNumber = Math.round(this.hsv.h);
      this.updateRGBInputFields();
      this.updateHEXInputField();
    };

    // When the left mouse button is pressed we attach a mouse move listener to the document to track the mouse movement
    // even outside the canvas.
    this.hCanvas.addEventListener("mousedown", (e) => {
      abortController = new AbortController();
      document.addEventListener("mousemove", (e) => {
        e.preventDefault();
        updateH(e.clientY - this.svCanvas.getBoundingClientRect().y);
      }, { signal: abortController.signal });


      isDragging = true;
      updateH(e.offsetY);
    });

    // Stop the drag tracking and remove the move listener from the document.
    document.addEventListener("mouseup", () => {
      if (isDragging && abortController) {
        abortController.abort();
        abortController = null;
        isDragging = false;
      }
    });
  }

  /**
   * This function clamps numbers inside a number input field to a given range and returns the number or null if it is
   * not valid.
   */
  private validateInput(element: HTMLInputElement, min: number, max: number): number | null {
    if (element.valueAsNumber < min) {
      element.valueAsNumber = min;
    } else if (element.valueAsNumber > max) {
      element.valueAsNumber = max;
    }

    return Number.isFinite(element.valueAsNumber) ? element.valueAsNumber : null;
  }

  /** This function validates the content of a number input, once it gets submitted or the focus is lost. */
  private validateFinalInput(element: HTMLInputElement, min: number, max: number): number | null {
    const value = this.validateInput(element, min, max);
    if (value === null) {
      element.valueAsNumber = min;
      return min;
    }
    return null;
  }

  /** Adds all the listeners to the text input fields. It also adds validation, so the values are always valid. */
  private addInputEventListeners() {
    this.setupHSVListeners();
    this.setupRGBListeners();
    this.setupHEXListeners();
  }

  /** Sets up all listeners for the HSV input fields. */
  private setupHSVListeners() {
    const onHSVUpdate = () => {
      this.sendUpdate();
      this.drawAll();
      this.updateRGBInputFields();
      this.updateHEXInputField();
    };

    // Setup hue listeners ---------------------------------------------------------------------------------------------

    const onHueUpdate = (value) => {
      if (value !== null) {
        this.hsv.h = value;
        this.backUpHue = value;
        onHSVUpdate();
      }
    };

    this.inputFields.h.addEventListener("input", (ev: InputEvent) => {
      const value = this.validateInput(ev.currentTarget as HTMLInputElement, 0, 360);
      onHueUpdate(value);
    });

    this.inputFields.h.addEventListener("wheel", (ev: WheelEvent) => {
      ev.preventDefault();

      let value = Math.round(this.hsv.h);
      if (ev.deltaY > 0) {        // Decrement
        value = clamp(value - 1, 0, 360);
      } else if (ev.deltaY < 0) { // Increment
        value = clamp(value + 1, 0, 360);
      }

      onHueUpdate(value);
      this.inputFields.h.valueAsNumber = value;
    });

    const validateHField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = this.validateFinalInput(el, 0, 360);
      onHueUpdate(value);
    };

    this.inputFields.h.addEventListener("focusout", validateHField);
    this.inputFields.h.addEventListener("keypress", (ev: KeyboardEvent) => {
      if (ev.key === "Enter") {
        validateHField(ev);
      }
    });


    // Setup saturation listeners --------------------------------------------------------------------------------------

    const onSaturationUpdate = (value) => {
      if (value !== null) {
        this.hsv.s = value / 100;
        this.backUpSaturation = this.hsv.s;
        onHSVUpdate();
      }
    };

    this.inputFields.s.addEventListener("input", (ev: InputEvent) => {
      const value = this.validateInput(ev.currentTarget as HTMLInputElement, 0, 100);
      onSaturationUpdate(value);
    });

    this.inputFields.s.addEventListener("wheel", (ev: WheelEvent) => {
      ev.preventDefault();

      let value = Math.round(this.hsv.s * 100);
      if (ev.deltaY > 0) {        // Decrement
        value = clamp(value - 1, 0, 100);
      } else if (ev.deltaY < 0) { // Increment
        value = clamp(value + 1, 0, 100);
      }

      onSaturationUpdate(value);
      this.inputFields.s.valueAsNumber = value;
    });

    const validateSField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = this.validateFinalInput(el, 0, 100);
      onSaturationUpdate(value);
    };

    this.inputFields.s.addEventListener("focusout", validateSField);
    this.inputFields.s.addEventListener("keypress", (ev: KeyboardEvent) => {
      if (ev.key === "Enter") {
        validateSField(ev);
      }
    });

    // Setup value listeners -------------------------------------------------------------------------------------------

    const onValueUpdate = (value) => {
      if (value !== null) {
        this.hsv.v = value / 100;
        onHSVUpdate();
      }
    };

    this.inputFields.v.addEventListener("input", (ev: InputEvent) => {
      const value = this.validateInput(ev.currentTarget as HTMLInputElement, 0, 100);
      onValueUpdate(value);
    });

    this.inputFields.v.addEventListener("wheel", (ev: WheelEvent) => {
      ev.preventDefault();

      let value = Math.round(this.hsv.v * 100);
      if (ev.deltaY > 0) {        // Decrement
        value = clamp(value - 1, 0, 100);
      } else if (ev.deltaY < 0) { // Increment
        value = clamp(value + 1, 0, 100);
      }

      onValueUpdate(value);
      this.inputFields.v.valueAsNumber = value;
    });

    const validateVField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = this.validateFinalInput(el, 0, 100);
      onValueUpdate(value);
    };

    this.inputFields.v.addEventListener("focusout", validateVField);
    this.inputFields.v.addEventListener("keypress", (ev: KeyboardEvent) => {
      if (ev.key === "Enter") {
        validateVField(ev);
      }
    });
  }

  /** Sets up all listeners for the RGB input fields. */
  private setupRGBListeners() {
    const onRGBUpdate = (r, g, b) => {
      this.hsv = d3HSV(`rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`);
      this.validateHueAndSaturation();
      this.sendUpdate();
      this.drawAll();
      this.updateHSVInputFields();
      this.updateHEXInputField();
    };

    // Setup red listeners ---------------------------------------------------------------------------------------------

    const onRedUpdate = (value) => {
      if (value !== null) {
        const oldRGB = this.hsv.rgb();
        onRGBUpdate(value, oldRGB.g, oldRGB.b);
      }
    };

    this.inputFields.r.addEventListener("input", (ev: InputEvent) => {
      const value = this.validateInput(ev.currentTarget as HTMLInputElement, 0, 255);
      onRedUpdate(value);
    });

    this.inputFields.r.addEventListener("wheel", (ev: WheelEvent) => {
      ev.preventDefault();

      const oldRGB = this.hsv.rgb();
      let value = oldRGB.r;
      if (ev.deltaY > 0) {        // Decrement
        value = clamp(value - 1, 0, 255);
      } else if (ev.deltaY < 0) { // Increment
        value = clamp(value + 1, 0, 255);
      }

      onRedUpdate(value);
      this.inputFields.r.valueAsNumber = Math.round(value);
    });

    const validateRField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = this.validateFinalInput(el, 0, 255);
      onRedUpdate(value);
    };

    this.inputFields.r.addEventListener("focusout", validateRField);
    this.inputFields.r.addEventListener("keypress", (ev: KeyboardEvent) => {
      if (ev.key === "Enter") {
        validateRField(ev);
      }
    });

    // Setup green listeners -------------------------------------------------------------------------------------------

    const onGreenUpdate = (value) => {
      if (value !== null) {
        const oldRGB = this.hsv.rgb();
        onRGBUpdate(oldRGB.r, value, oldRGB.b);
      }
    };

    this.inputFields.g.addEventListener("input", (ev: InputEvent) => {
      const value = this.validateInput(ev.currentTarget as HTMLInputElement, 0, 255);
      onGreenUpdate(value);
    });

    this.inputFields.g.addEventListener("wheel", (ev: WheelEvent) => {
      ev.preventDefault();

      const oldRGB = this.hsv.rgb();
      let value = oldRGB.g;
      if (ev.deltaY > 0) {        // Decrement
        value = clamp(value - 1, 0, 255);
      } else if (ev.deltaY < 0) { // Increment
        value = clamp(value + 1, 0, 255);
      }

      onGreenUpdate(value);
      this.inputFields.g.valueAsNumber = Math.round(value);
    });

    const validateGField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = this.validateFinalInput(el, 0, 255);
      onGreenUpdate(value);
    };

    this.inputFields.g.addEventListener("focusout", validateGField);
    this.inputFields.g.addEventListener("keypress", (ev: KeyboardEvent) => {
      if (ev.key === "Enter") {
        validateGField(ev);
      }
    });

    // Setup blue listeners --------------------------------------------------------------------------------------------

    const onBlueUpdate = (value) => {
      if (value !== null) {
        const oldRGB = this.hsv.rgb();
        onRGBUpdate(oldRGB.r, oldRGB.g, value);
      }
    };

    this.inputFields.b.addEventListener("input", (ev: InputEvent) => {
      const value = this.validateInput(ev.currentTarget as HTMLInputElement, 0, 255);
      onBlueUpdate(value);
    });

    this.inputFields.b.addEventListener("wheel", (ev: WheelEvent) => {
      ev.preventDefault();

      const oldRGB = this.hsv.rgb();
      let value = oldRGB.b;
      if (ev.deltaY > 0) {        // Decrement
        value = clamp(value - 1, 0, 255);
      } else if (ev.deltaY < 0) { // Increment
        value = clamp(value + 1, 0, 255);
      }

      onBlueUpdate(value);
      this.inputFields.b.valueAsNumber = Math.round(value);
    });

    const validateBField = (ev: Event) => {
      const el = ev.currentTarget as HTMLInputElement;
      const value = this.validateFinalInput(el, 0, 255);
      onBlueUpdate(value);
    };

    this.inputFields.b.addEventListener("focusout", validateBField);
    this.inputFields.b.addEventListener("keypress", (ev: KeyboardEvent) => {
      if (ev.key === "Enter") {
        validateBField(ev);
      }
    });
  }

  /** Sets up all listeners for the HEX input field. */
  private setupHEXListeners() {
    this.inputFields.hex.addEventListener("input", (ev: InputEvent) => {
      const element = ev.currentTarget as HTMLInputElement;
      const value = element.value;
      if (value.match(/#([0-7a-fA-F]{3}$|[0-7a-fA-F]{6}$)/)) {
        this.hsv = d3HSV(value);
        this.validateHueAndSaturation();
        this.sendUpdate();
        this.drawAll();
        this.updateRGBInputFields();
        this.updateHSVInputFields();
        element.classList.remove("tfe-color-picker-input-hex-invalid");
      } else {
        element.classList.add("tfe-color-picker-input-hex-invalid");
      }
    });

    this.inputFields.hex.addEventListener("focusout", (ev: InputEvent) => {
      const element = ev.currentTarget as HTMLInputElement;
      const value = element.value;
      if (!value.match(/#([0-7a-fA-F]{3}$|[0-7a-fA-F]{6}$)/)) {
        element.value = this.getHEX();
        element.classList.remove("tfe-color-picker-input-hex-invalid");
      }
    });
  }

  /** Updates the text inside the hsv input fields. */
  private updateHSVInputFields() {
    this.inputFields.h.valueAsNumber = clamp(Math.round(this.hsv.h), 0, 360);
    this.inputFields.s.valueAsNumber = clamp(Math.round(this.hsv.s * 100), 0, 100);
    this.inputFields.v.valueAsNumber = clamp(Math.round(this.hsv.v * 100), 0, 100);
  }

  /** Updates the text inside the rgb input fields. */
  private updateRGBInputFields() {
    const rgb = this.hsv.rgb();
    this.inputFields.r.valueAsNumber = clamp(Math.round(rgb.r), 0, 255);
    this.inputFields.g.valueAsNumber = clamp(Math.round(rgb.g), 0, 255);
    this.inputFields.b.valueAsNumber = clamp(Math.round(rgb.b), 0, 255);
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


// Add a stylesheet to the header, that contains the base layout of the color picker.
if (document.head.querySelector("#tfe-color-picker-style") === null) {
  document.head.insertAdjacentHTML("beforeend", `
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
        border-radius: 25px;
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
    </style>`
  );
}
