import {AlphaStop, ColorMap, InterpolationMethod, TransferFunction} from './Types';
import * as d3Scale from 'd3-scale';
import * as d3Color from 'd3-color';
import * as d3Interpolate from 'd3-interpolate';
import objectAssignDeep from 'object-assign-deep';
import {getColorFromColorMapAt} from './convert';
import Container from './Container';

/**
 * This creates an editor to create transparency mappings.
 *
 * @example
 *   const te = new TransparencyEditor("#te", {
 *      initialAlphaStops: [
 *        { stop: 0, alpha: 0 },
 *        { stop: 0.5, alpha: 0.5 },
 *        { stop: 1, alpha: 1 }
 *      ]
 *   });
 *
 *   te.addListener((transparencyEditor) => {
 *     console.log(transparencyEditor.getAlphaStops());
 *     // output:
 *     // [
 *     //   { stop: 0, alpha: 0 },
 *     //   { stop: 0.5, alpha: 0.5 },
 *     //   { stop: 1, alpha: 1 }
 *     // ]
 *   });
 */
export class TransparencyEditor extends Container {
  /** The gradient and stops are painted in here. It also handles mouse input. */
  private readonly canvas: HTMLCanvasElement;

  /** The context for the canvas for convenience. */
  private ctx: CanvasRenderingContext2D;

  /** This is the transparency map, that everything revolves around. The stops are always sorted. */
  private alphaStops: Array<AlphaStop>;

  /**
   * This color map is used for drawing a gradient in the background. It can be set via function calls, but not via user
   * interaction. For a complete transfer function editor with an editable color map use the TransferFunctionEditor
   * class.
   */
  private colorMap: ColorMap;

  /** This is used to easily calculate alpha values. */
  private alphaRange: d3Scale.ScaleLinear<number, number>;

  /** The size of the control points. Might become configurable in the future. */
  private controlPointSize: number;

  /** If the classic grid pattern is rendered for the transparency. */
  private showAlphaGrid: boolean;

  /** The pixel size of the alpha grid squares. */
  private alphaGridSize: number;

  /** This gets called, when the transparency changes to notify users of this library. */
  private callbacks: Map<number, (transparencyEditor: TransparencyEditor) => void> = new Map();
  private callbackCounter = 0;

  /**
   * Creates a new transparency editor inside the given container.
   *
   * @param container Either an HTMLElement or a query string to an element, in which the editor will be embedded.
   * @param options   Can be used to configure the transparency editor. See {@link TransparencyEditorOptions}.
   */
  constructor(container: HTMLElement | string, options?: TransparencyEditorOptions) {
    super(container);

    // Set all defaults.
    const defaultOption: TransparencyEditorOptions = {
      initialAlphaStops: [
        {stop: 0, alpha: 0},
        {stop: 0.5, alpha: 0.5},
        {stop: 1, alpha: 1},
      ],
      initialColorMap: {
        colorStops: [
          {stop: 0, color: 'black'},
          {stop: 1, color: 'black'},
        ],
        interpolationMethod: InterpolationMethod.RGB,
      },
      controlPointSize: 7,
      showAlphaGrid: true,
      alphaGridSize: 8,
    };

    // Merge the options with the defaults.
    // !!! DON'T USE options AND defaultOptions AFTER THIS LINE !!!
    const finalOptions = objectAssignDeep(defaultOption, options);

    this.alphaStops = finalOptions.initialAlphaStops;
    this.sortControlPoints();
    this.colorMap = finalOptions.initialColorMap;

    this.controlPointSize = finalOptions.controlPointSize;

    this.showAlphaGrid = finalOptions.showAlphaGrid;
    this.alphaGridSize = finalOptions.alphaGridSize;

    this.parent.classList.add('tfe-transparency-editor');

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.parent.clientWidth;
    this.canvas.height = this.parent.clientHeight;
    this.canvas.style.imageRendering = 'pixelated';
    this.parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.updateAlphaRange();
    this.draw();
    this.addEventListeners();
  }

  /**
   * Register a callback that gets called, when the transfer function changes. The callback gets called once
   * immediately.
   *
   * @param callback The function that gets called whenever the transfer function changes.
   */
  public addListener(callback: (transparencyEditor: TransparencyEditor) => void): number {
    const id = this.callbackCounter++;
    this.callbacks.set(id, callback);
    callback(this);
    return id;
  }

  /** Removes the listener with the given id. */
  public removeListener(id: number) {
    this.callbacks.delete(id);
  }

  /** Returns the complete transfer function including the alpha values and the color map. */
  public getTransferFunction(): TransferFunction {
    return {alphaStops: this.alphaStops, colorMap: this.colorMap};
  }

  /** Returns the color, excluding transparency, at the given stop. */
  public getRGB(stop: number): string {
    return getColorFromColorMapAt(this.colorMap, stop);
  }

  /** Returns the alpha value at the given stop. */
  public getAlpha(stop: number): number {
    return this.alphaRange(stop);
  }

  /** Returns the color, including transparency, at the given stop. */
  public getRGBA(stop: number): string {
    const color = d3Color.rgb(this.getRGB(stop));
    color.opacity = this.getAlpha(stop);
    return color.formatHex8();
  }

  /** Adds a control point at the given stop with the given alpha value. */
  public addControlPoint(stop, alpha): void {
    this.alphaStops.push({stop, alpha});
    this.sortControlPoints();
    this.updateAlphaRange();
    this.sendUpdate();
    this.draw();
  }

  /** Remove a control point at the given pixel coordinates. */
  public removeControlPointAt(x, y): void {
    let indexToDelete = -1;
    for (let i = 1; i < this.alphaStops.length - 1; i++) {
      const controlPoint = this.alphaStops[i];
      const dx = controlPoint.stop * this.canvas.width - x;
      const dy = (1 - controlPoint.alpha) * this.canvas.height - y;
      if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
        indexToDelete = i;
        break;
      }
    }
    if (indexToDelete !== -1) {
      this.alphaStops.splice(indexToDelete, 1);
      this.updateAlphaRange();
      this.sendUpdate();
      this.draw();
    }
  }

  /** Get the alpha stops. */
  public getAlphaStops(): Array<AlphaStop> {
    return this.alphaStops;
  }

  /** Replace the existing alpha stops with new ones. */
  public setAlphaStops(alphaStops: Array<AlphaStop>) {
    this.alphaStops = alphaStops;
    this.sortControlPoints();
    this.updateAlphaRange();
    this.sendUpdate();
    this.draw();
  }

  /** Get the current color map. */
  public getColorMap(): ColorMap {
    return this.colorMap;
  }

  /** Set a new color map. */
  public setColorMap(colorMap: ColorMap) {
    this.colorMap = colorMap;
    this.sendUpdate();
    this.draw();
  }

  /** This function notifies all listeners to this transparency editor. */
  private sendUpdate() {
    this.callbacks.forEach((value) => value(this));
  }

  /** Generate a new d3 range. */
  private updateAlphaRange() {
    this.alphaRange = d3Scale
      .scaleLinear<number, number>()
      .domain(this.alphaStops.map((entry) => entry.stop))
      .range(this.alphaStops.map((entry) => entry.alpha))
      .interpolate(d3Interpolate.interpolateNumber);
  }

  /** Draws the transfer function, the control points, and the transparency grid into the canvas. */
  private draw() {
    // Clear the drawing area.
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // If the alpha grid is enabled we draw it.
    if (this.showAlphaGrid) {
      this.ctx.fillStyle = '#CACACA';
      for (let y = 0; y < this.canvas.height / this.alphaGridSize; y++) {
        for (let x = 0; x < this.canvas.width / this.alphaGridSize; x++) {
          if ((x % 2 == 0 && y % 2 == 0) || (x % 2 == 1 && y % 2 == 1)) {
            this.ctx.fillRect(x * this.alphaGridSize, y * this.alphaGridSize, this.alphaGridSize, this.alphaGridSize);
          }
        }
      }
    }

    // Draw the color gradient.
    for (let i = 0; i < this.canvas.width; ++i) {
      const alpha = this.getAlpha(i / (this.canvas.width - 1));
      this.ctx.fillStyle = this.getRGBA(i / (this.canvas.width - 1));
      this.ctx.fillRect(i, (1 - alpha) * this.canvas.height, 1, alpha * this.canvas.height);

      if (this.showAlphaGrid) {
        this.ctx.clearRect(i, 0, 1, (1 - alpha) * this.canvas.height);
      }
    }

    // Draw the lines between points.
    this.ctx.strokeStyle = 'black';
    this.ctx.beginPath();
    for (let i = 0; i < this.alphaStops.length; i++) {
      const x = this.alphaStops[i].stop * this.canvas.width;
      const y = (1 - this.alphaStops[i].alpha) * this.canvas.height;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();

    // Draw the control points.
    this.ctx.fillStyle = 'white';
    for (let i = 0; i < this.alphaStops.length; i++) {
      const x = this.alphaStops[i].stop * this.canvas.width;
      const y = (1 - this.alphaStops[i].alpha) * this.canvas.height;
      this.ctx.strokeStyle = 'black';
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.controlPointSize, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
    }
  }

  /** Helper function to ensure all control points are in the correct order. */
  private sortControlPoints() {
    this.alphaStops.sort((a, b) => a.stop - b.stop);
  }

  /** This helper function calculates which pixels correspond to which stop and alpha value. */
  private pixelToNormalized(x: number, y: number): {stop: number; alpha: number} {
    const stop = Math.max(0, Math.min(1, x / this.canvas.width));
    const alpha = Math.max(0, Math.min(1, 1 - y / this.canvas.height));
    return {stop, alpha};
  }

  /** Adds event listeners for creating, moving and deleting control points. */
  private addEventListeners() {
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
    const checkDragStart = (e: {offsetX: number; offsetY: number}) => {
      // Figure out which control point was selected.
      dragIndex = -1;
      for (let i = 0; i < this.alphaStops.length; i++) {
        const controlPoint = this.alphaStops[i];
        const dx = controlPoint.stop * this.canvas.width - e.offsetX;
        const dy = (1 - controlPoint.alpha) * this.canvas.height - e.offsetY;
        if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
          dragIndex = i;
          isDragging = true;
          break;
        }
      }

      if (isDragging) {
        // Attach a mouse move listener to the document.
        abortController = new AbortController();
        document.addEventListener(
          'mousemove',
          (e) => {
            e.preventDefault();
            const offsetX = e.clientX - this.canvas.getBoundingClientRect().x;
            const offsetY = e.clientY - this.canvas.getBoundingClientRect().y;

            const {stop, alpha} = this.pixelToNormalized(offsetX, offsetY);

            if (dragIndex === 0) {
              this.alphaStops[dragIndex].alpha = alpha;
            } else if (dragIndex === this.alphaStops.length - 1) {
              this.alphaStops[dragIndex].alpha = alpha;
            } else {
              const leftBound = this.alphaStops[dragIndex - 1].stop + Number.EPSILON;
              const rightBound = this.alphaStops[dragIndex + 1].stop - Number.EPSILON;
              this.alphaStops[dragIndex].stop = Math.max(leftBound, Math.min(rightBound, stop));
              this.alphaStops[dragIndex].alpha = alpha;
            }
            this.updateAlphaRange();
            this.sendUpdate();
            this.draw();
          },
          {signal: abortController.signal}
        );
      }
    };

    // This listener is responsible for:
    //  - Starting dragging a control point, if one was pressed on with the left mouse button.
    //  - Adding a control point if the left mouse button was pressed anywhere else (also starts dragging the newly
    //    created point).
    //  - Removing a control point on right click.
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        // Left click
        checkDragStart(e);
      }

      if (isDragging) {
        return;
      }

      if (e.button === 0) {
        // Left click
        const {stop, alpha} = this.pixelToNormalized(e.offsetX, e.offsetY);
        this.addControlPoint(stop, alpha);
        checkDragStart(e);
      } else if (e.button === 2) {
        // Right click
        e.preventDefault();
        this.removeControlPointAt(e.offsetX, e.offsetY);
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });

    // This listener is responsible to stop the dragging action, once the mouse is lifted.
    document.addEventListener('mouseup', () => {
      if (isDragging && abortController) {
        abortController.abort();
        abortController = null;
        isDragging = false;
        dragIndex = -1;
      }
    });

    // Ensure, that when the container size changes we adjust the canvas size and redraw.
    const resizeObserver = new ResizeObserver(() => {
      this.canvas.width = this.parent.clientWidth;
      this.canvas.height = this.parent.clientHeight;
      this.draw();
    });
    resizeObserver.observe(this.parent);
  }
}

/**
 * The config options for the {@link TransparencyEditor} component.
 */
export interface TransparencyEditorOptions {
  /**
   * The initial list of alpha stops.
   * Default:
   * [
   *   { stop: 0, alpha: 0 },
   *   { stop: 0.5, alpha: 0.5 },
   *   { stop: 1, alpha: 1 }
   * ]
   */
  initialAlphaStops?: Array<AlphaStop>;

  /**
   * The initial color map.
   * Default:
   * {
   *   colorStops: [
   *     { stop: 0, color: "black" },
   *     { stop: 1, color: "black" }
   *   ],
   *   interpolationMethod: InterpolationMethod.RGB
   * }
   */
  initialColorMap?: ColorMap;

  /**
   * The size of control points in pixel.
   * Default: 7
   */
  controlPointSize?: number;

  /**
   * If the transparency should be visualized using the classic grid.
   * Default: true
   */
  showAlphaGrid?: boolean;

  /**
   * The size in pixel of the grid cells.
   * Default: 8
   */
  alphaGridSize?: number;
}
