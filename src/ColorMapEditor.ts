import * as d3Scale from "d3-scale";
import { ColorStop } from "./Types";
import * as d3Interpolate from "d3-interpolate";
import { ColorPicker } from "./ColorPicker";

/**
 * This creates a color map editor component, where the user can create a color gradient using stops and colors.
 *
 * @example
 * ```
 *   const cm = new ColorMapEditor("#cm", {
 *     initialColorMap: [
 *       { stop: 0, rgb: "#0f0" },
 *       { stop: 0.5, rgb: "#f00" },
 *       { stop: 1, rgb: "#000" }
 *     ]
 *   });
 *
 *   cm.addListener((newColorMap) => {
 *     console.log(newColorMap); // [{stop: 0, rgb: "#0f0"},{stop: 0.5, rgb: "#f00"},{stop: 1, rgb: "#000"}]
 *   });
 * ```
 */
export class ColorMapEditor {
  /** The root element, in which the color map editor gets embedded. */
  private readonly container: HTMLElement;

  /** The gradient and stops are painted in here. It also handles mouse input. */
  private readonly canvas: HTMLCanvasElement;

  /** The context for the canvas for convenience. */
  private ctx: CanvasRenderingContext2D;

  /** This helps rendering the gradient in the canvas. */
  private colorRange: d3Scale.ScaleLinear<string, string>;

  /** This is the color map that everything revolves around. */
  private colorMap: Array<ColorStop>;

  /** The size of the control points. Might become configurable in the future. */
  private controlPointSize: number = 7;

  /** The color picker for editing control point colors is embedded in this div. */
  private readonly colorPickerContainer: HTMLDivElement;

  /** The color picker for editing control point colors. */
  private colorPicker: ColorPicker;

  /** This gets called, when the color changes to notify users of this library. */
  private callbacks: Map<number, (colorMap: Array<ColorStop>) => void> = new Map();
  private callbackCounter = 0;

  /**
   * Creates a new color map editor inside the given container.
   *
   * @param container Either an HTMLElement or a query string to an element, in which the color picker will be embedded.
   * @param options   Can be used to configure the color map editor. See {@link ColorMapEditorOptions}.
   */
  constructor(container: HTMLElement | string, options?: ColorMapEditorOptions) {
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
    const defaultOptions: ColorMapEditorOptions = {
      initialColorMap: [
        { stop: 0, rgb: "blue" },
        { stop: 0.5, rgb: "white" },
        { stop: 1, rgb: "red" }
      ]
    };

    // Merge the options with the defaults.
    // !!! DON'T USE options AND defaultOptions AFTER THIS LINE !!!
    const finalOptions = Object.assign(defaultOptions, options);

    this.colorMap = finalOptions.initialColorMap;

    this.container.classList.add("tfe-color-map-editor");

    // Prepare the canvas and the context.
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;

    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d", { alpha: false });

    // Prepare the container for the color picker and initialize it.
    this.colorPickerContainer = document.createElement("div");
    this.colorPickerContainer.classList.add("tfe-color-map-editor-color-picker-container");
    this.colorPickerContainer.style.width = "fit-content";
    this.colorPickerContainer.style.padding = "12px";
    this.colorPickerContainer.style.backgroundColor = "white";
    this.colorPickerContainer.style.border = "1px solid black";
    this.colorPickerContainer.style.visibility = "hidden";
    this.colorPickerContainer.style.position = "relative";
    this.container.appendChild(this.colorPickerContainer);
    this.colorPicker = new ColorPicker(this.colorPickerContainer);

    // Initial draw.
    this.updateColorRange();
    this.draw();

    // Add all event listeners.
    this.addEventListeners();
  }

  /** Set a new color map. */
  public setColorMap(colorMap: Array<ColorStop>) {
    this.colorMap = colorMap;
    this.updateColorRange();
    this.draw();
    this.sendUpdates();
  }

  /** Get the current color map. */
  public getColorMap(): Array<ColorStop> {
    return this.colorMap;
  }

  /**
   * Register a callback that gets called, when the color map changes.
   *
   * @param callback   The function that gets called whenever the color map changes.
   */
  public addListener(callback: (colorMap: Array<ColorStop>) => void): number {
    const id = this.callbackCounter++;
    this.callbacks.set(id, callback);
    callback(this.colorMap);
    return id;
  }

  /** Removes the listener with the given id. */
  public removeListener(id: number) {
    this.callbacks.delete(id);
  }

  /** This function notifies all listeners to this color map editor. */
  private sendUpdates() {
    this.callbacks.forEach((value) => value(this.colorMap));
  }

  /** Draws the gradient and the control points. */
  private draw() {
    // Draw the gradient.
    for (let i = 0; i < this.canvas.width; ++i) {
      this.ctx.fillStyle = this.colorRange(i / (this.canvas.width - 1));
      this.ctx.fillRect(i, 0, 1, this.canvas.height);
    }

    // Draw the control points. To ensure visibility everywhere it is an alternating circle in white and black.
    this.ctx.fillStyle = "transparent";
    for (let i = 0; i < this.colorMap.length; i++) {
      const x = this.colorMap[i].stop * this.canvas.width;
      const y = 0.5 * this.canvas.height;
      const strokes = 10;
      for (let i = 0; i < strokes; i++) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = i % 2 === 0 ? "white" : "black";
        this.ctx.arc(x, y, this.controlPointSize, (i / strokes) * (2 * Math.PI), ((i + 1) / strokes) * (2 * Math.PI));
        this.ctx.stroke();
      }
    }
  }

  /** This updates the d3-color range, which helps when drawing the gradient. */
  private updateColorRange() {
    this.colorRange = d3Scale
      .scaleLinear<string, number>()
      .domain(this.colorMap.map((entry) => entry.stop))
      .range(this.colorMap.map((entry) => entry.rgb))
      .interpolate(d3Interpolate.interpolateHslLong);
  }

  /** Adds event listeners for adding, removing and moving control points as well as showing the color picker. */
  private addEventListeners() {
    // This flag prevents click events to trigger when dragging control points small distances.
    let draggedBefore: boolean = false;

    // Tracks if the user is currently dragging a control point.
    let isDragging: boolean = false;

    // The index of the currently dragged control point.
    let dragIndex: number = -1;

    // The AbortController is for removing the mousemove listener from the document, when the user stops dragging.
    let abortController: AbortController = null;


    /**
     * This function checks if a control point was selected, sets the dragIndex and isDragging fields and attaches a
     * mouse move listener to the document. This allows for more consistent control.
     */
    const checkDragStart = (e: { offsetX: number; offsetY: number }) => {
      // Figure out which control point was selected.
      dragIndex = -1;
      for (let i = 0; i < this.colorMap.length; i++) {
        const stop = this.colorMap[i];
        const dx = Math.abs(stop.stop * this.canvas.width - e.offsetX);
        if (dx < this.controlPointSize) {
          dragIndex = i;
          isDragging = true;
          break;
        }
      }

      if (isDragging) {
        // Attach a mouse move listener to the document.
        abortController = new AbortController();
        document.addEventListener("mousemove", (e) => {
          e.preventDefault();
          const offsetX = e.clientX - this.canvas.getBoundingClientRect().x;
          const x = Math.max(0, Math.min(1, offsetX / this.canvas.width));

          if (dragIndex !== 0 && dragIndex !== this.colorMap.length - 1) {
            this.colorMap[dragIndex].stop = x;
          }

          this.colorMap.sort((a, b) => a.stop - b.stop);
          this.updateColorRange();
          this.draw();
          this.sendUpdates();
          draggedBefore = true;
        }, { signal: abortController.signal });
      }
    };

    // This listener is responsible for:
    //  - Starting dragging a control point, if one was pressed on with the left mouse button.
    //  - Adding a control point if the left mouse button was pressed anywhere else (also starts dragging the newly
    //    created point).
    //  - Removing a control point on middle click.
    this.canvas.addEventListener("mousedown", (e) => {
      draggedBefore = false;

      if (e.button === 0) { // Left Mouse Button
        // Check if a control point was selected with the left mouse button.
        checkDragStart(e);

        if (!isDragging) {
          // If no control point was selected a new one is being created and also immediately dragged.
          const x = Math.max(0, Math.min(1, e.offsetX / this.canvas.width));
          const rgb = this.colorRange(x);
          const stop = { stop: x, rgb };
          this.colorMap.push(stop);
          this.colorMap.sort((a, b) => a.stop - b.stop);
          this.updateColorRange();
          this.draw();
          this.sendUpdates();
          checkDragStart(e);
        }
      } else if (e.button === 1) { // Middle Mouse Button
        e.preventDefault();
        // If a control point was pressed on with the MMB it gets removed.
        for (let i = 1; i < this.colorMap.length - 1; i++) {
          const stop = this.colorMap[i];
          const dx = stop.stop * this.canvas.width - e.offsetX;
          const dy = 0.5 * this.canvas.height - e.offsetY;
          if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
            this.colorMap.splice(i, 1);
            this.updateColorRange();
            this.draw();
            this.sendUpdates();
            return;
          }
        }
      }
    });

    // This listener is responsible to stop the dragging action, once the mouse is lifted.
    document.addEventListener("mouseup", () => {
      if (isDragging && abortController) {
        abortController.abort();
        abortController = null;
        isDragging = false;
        dragIndex = -1;
      }
    });

    // This saves the id of the callback from the color picker.
    let colorPickerListener = -1;

    // When clicking a control point the color picker is shown.
    this.canvas.addEventListener("click", (e) => {
      if (draggedBefore) {
        return;
      }

      e.stopPropagation();
      let stop = null;
      for (let i = 0; i < this.colorMap.length; i++) {
        stop = this.colorMap[i];
        const dx = Math.abs(stop.stop * this.canvas.width - e.offsetX);
        if (dx < this.controlPointSize) {
          break;
        }
      }

      if (stop !== null) {
        // Figure out, where to position the color picker popup, depending on the available space.
        const pageY = this.canvas.height / 2 + this.canvas.getBoundingClientRect().y;
        const viewPortHeight = window.innerHeight;
        const cpHeight = this.colorPickerContainer.clientHeight;

        if (pageY + cpHeight < viewPortHeight) {
          // Show below the point
          const y = this.canvas.height / 2;
          this.colorPickerContainer.style.bottom = `${y}px`;
        } else if (pageY - cpHeight > 0) {
          // Show above the point
          const y = this.canvas.height / 2 + cpHeight;
          this.colorPickerContainer.style.bottom = `${y}px`;
        } else {
          // Show vertically centered on the point
          const y = this.canvas.height / 2 + cpHeight / 2;
          this.colorPickerContainer.style.bottom = `${y}px`;
        }

        const pageX = stop.stop * this.canvas.width + this.canvas.getBoundingClientRect().x;
        const viewPortWidth = window.innerWidth;
        const cpWidth = this.colorPickerContainer.clientWidth;

        if (pageX + cpWidth < viewPortWidth) {
          // Show right of the point
          const x = stop.stop * this.canvas.width;
          this.colorPickerContainer.style.left = `${x}px`;
        } else if (pageX - cpWidth > 0) {
          // Show left of the point
          const x = stop.stop * this.canvas.width - cpWidth;
          this.colorPickerContainer.style.left = `${x}px`;
        } else {
          // Show horizontally centered on the point
          const x = stop.stop * this.canvas.width - cpWidth / 2;
          this.colorPickerContainer.style.left = `${x}px`;
        }

        this.colorPickerContainer.style.visibility = "visible";
        this.colorPicker.removeListener(colorPickerListener);
        this.colorPicker.setHEX(stop.rgb);
        colorPickerListener = this.colorPicker.addListener((newColor) => {
          stop.rgb = newColor.hex;
          this.updateColorRange();
          this.draw();
          this.sendUpdates();
        });
      }
    });

    // Hides the color picker, if you click outside it.
    document.addEventListener("click", () => {
      this.colorPickerContainer.style.visibility = "hidden";
    });

    // This prevents the color picker from closing when clicking inside it.
    this.colorPickerContainer.addEventListener("click", (e) => e.stopPropagation());

    // Ensures that the canvas gets redrawn when its size changes.
    const resizeObserver = new ResizeObserver(() => {
      this.canvas.width = this.container.clientWidth;
      this.canvas.height = this.container.clientHeight;
      this.draw();
    });
    resizeObserver.observe(this.container);
  }
}

/**
 * The config options for the {@link ColorMapEditor} component.
 */
export interface ColorMapEditorOptions {
  /**
   * The initial color map.
   * Default:
   * [
   *   { stop: 0, rgb: "blue" },
   *   { stop: 0.5, rgb: "white" },
   *   { stop: 1, rgb: "red" }
   * ]
   */
  initialColorMap?: Array<ColorStop>;
}