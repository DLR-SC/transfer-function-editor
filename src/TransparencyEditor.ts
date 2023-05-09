import { AlphaStop, ColorMap, InterpolationMethod, TransferFunction } from "./Types";
import * as d3Scale from "d3-scale";
import * as d3Color from "d3-color";
import * as d3Interpolate from "d3-interpolate";
import objectAssignDeep from "object-assign-deep";
import { getColorFromColorMapAt } from "./convert";

export class TransparencyEditor {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private transferFunction: Array<AlphaStop>;
  private colorMap: ColorMap;

  private alphaRange: d3Scale.ScaleLinear<number, number>;

  private controlPointSize: number;

  private showAlphaGrid: boolean;
  private alphaGridSize: number;

  private callbacks: Map<number, (transparencyEditor: TransparencyEditor) => void> = new Map();
  private callbackCounter = 0;

  constructor(container: HTMLElement | string, options?: TransparencyEditorOptions) {
    if (container) {
      if (typeof container === "string") {
        this.container = document.querySelector(container);
      } else {
        this.container = container;
      }
    } else {
      throw "No element given!";
    }

    const defaultOption: TransparencyEditorOptions = {
      initialTransferFunction: [
        { stop: 0, alpha: 1 },
        { stop: 0.5, alpha: 0.5 },
        { stop: 1, alpha: 0 }
      ],
      initialColorMap: {
        colorStops: [
          { stop: 0, color: "black" },
          { stop: 1, color: "black" }
        ],
        interpolationMethod: InterpolationMethod.HSL_LONG
      },
      controlPointSize: 7,
      showAlphaGrid: true,
      alphaGridSize: 8
    };
    const finalOptions = objectAssignDeep(defaultOption, options);

    this.transferFunction = finalOptions.initialTransferFunction;
    this.colorMap = finalOptions.initialColorMap;

    this.controlPointSize = finalOptions.controlPointSize;

    this.showAlphaGrid = finalOptions.showAlphaGrid;
    this.alphaGridSize = finalOptions.alphaGridSize;

    this.container.classList.add("tfe-transparency-editor");

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
    this.canvas.style.imageRendering = "pixelated";
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.updateAlphaRange();
    this.draw();
    this.addEventListeners();
  }

  public addListener(callback: (transparencyEditor: TransparencyEditor) => void): number {
    const id = this.callbackCounter++;
    this.callbacks.set(id, callback);
    callback(this);
    return id;
  }

  public removeListener(id: number) {
    this.callbacks.delete(id);
  }

  public getTransferFunction(): TransferFunction {
    return { alphaStops: this.transferFunction, colorMap: this.colorMap };
  }

  public getRGB(stop: number): string {
    return getColorFromColorMapAt(this.colorMap, stop);
  }

  public getAlpha(stop: number): number {
    return this.alphaRange(stop);
  }

  public getRGBA(stop: number): string {
    const color = d3Color.rgb(this.getRGB(stop));
    const a = this.getAlpha(stop);
    color.opacity = 1 - a;
    return color.formatHex8();
  }

  public addControlPoint(stop, alpha): void {
    this.transferFunction.push({ stop, alpha });
    this.sortControlPoints();
    this.updateAlphaRange();
    this.sendUpdate();
    this.draw();
  }

  public removeControlPointAt(x, y): void {
    let indexToDelete = -1;
    for (let i = 1; i < this.transferFunction.length - 1; i++) {
      const controlPoint = this.transferFunction[i];
      const dx = controlPoint.stop * this.canvas.width - x;
      const dy = controlPoint.alpha * this.canvas.height - y;
      if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
        indexToDelete = i;
        break;
      }
    }
    if (indexToDelete !== -1) {
      this.transferFunction.splice(indexToDelete, 1);
      this.updateAlphaRange();
      this.sendUpdate();
      this.draw();
    }
  }

  public setAlphaStops(alphaStops: Array<AlphaStop>) {
    this.transferFunction = alphaStops;
    this.updateAlphaRange();
    this.sendUpdate();
    this.draw();
  }

  public getAlphaStops(): Array<AlphaStop> {
    return this.transferFunction;
  }

  public setColorMap(colorMap: ColorMap) {
    this.colorMap = colorMap;
    this.sendUpdate();
    this.draw();
  }

  private sendUpdate() {
    this.callbacks.forEach((value) => value(this));
  }

  private updateAlphaRange() {
    this.alphaRange = d3Scale
      .scaleLinear<number, number>()
      .domain(this.transferFunction.map((entry) => entry.stop))
      .range(this.transferFunction.map((entry) => entry.alpha))
      .interpolate(d3Interpolate.interpolateNumber);
  }

  private draw() {
    // Clear the drawing area.
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.showAlphaGrid) {
      this.ctx.fillStyle = "#CACACA";
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
      this.ctx.fillRect(i, alpha * this.canvas.height, 1, (1 - alpha) * this.canvas.height);

      if (this.showAlphaGrid) {
        this.ctx.clearRect(i, 0, 1, alpha * this.canvas.height);
      }
    }

    // Draw the lines between points.
    this.ctx.strokeStyle = "black";
    this.ctx.beginPath();
    for (let i = 0; i < this.transferFunction.length; i++) {
      const x = this.transferFunction[i].stop * this.canvas.width;
      const y = this.transferFunction[i].alpha * this.canvas.height;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();

    // Draw the control points.
    this.ctx.fillStyle = "white";
    for (let i = 0; i < this.transferFunction.length; i++) {
      const x = this.transferFunction[i].stop * this.canvas.width;
      const y = this.transferFunction[i].alpha * this.canvas.height;
      this.ctx.strokeStyle = "black";
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.controlPointSize, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
    }
  }

  private sortControlPoints() {
    this.transferFunction.sort((a, b) => a.stop - b.stop);
  }

  private pixelToNormalized(x: number, y: number): { stop: number; alpha: number } {
    const stop = Math.max(0, Math.min(1, x / this.canvas.width));
    const alpha = Math.max(0, Math.min(1, y / this.canvas.height));
    return { stop, alpha };
  }

  private addEventListeners() {
    let isDragging: boolean = false;
    let dragIndex: number = -1;
    let abortController: AbortController = null;

    const checkDragStart = (e: { offsetX: number; offsetY: number }) => {
      dragIndex = -1;
      for (let i = 0; i < this.transferFunction.length; i++) {
        const controlPoint = this.transferFunction[i];
        const dx = controlPoint.stop * this.canvas.width - e.offsetX;
        const dy = controlPoint.alpha * this.canvas.height - e.offsetY;
        if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
          dragIndex = i;
          isDragging = true;
          break;
        }
      }

      if (isDragging) {
        abortController = new AbortController();
        document.addEventListener("mousemove", (e) => {
          e.preventDefault();
          const offsetX = e.clientX - this.canvas.getBoundingClientRect().x;
          const offsetY = e.clientY - this.canvas.getBoundingClientRect().y;

          const { stop, alpha } = this.pixelToNormalized(offsetX, offsetY);

          if (dragIndex === 0) {
            this.transferFunction[dragIndex].alpha = alpha;
          } else if (dragIndex === this.transferFunction.length - 1) {
            this.transferFunction[dragIndex].alpha = alpha;
          } else {
            const leftBound = this.transferFunction[dragIndex - 1].stop + Number.EPSILON;
            const rightBound = this.transferFunction[dragIndex + 1].stop - Number.EPSILON;
            this.transferFunction[dragIndex].stop = Math.max(leftBound, Math.min(rightBound, stop));
            this.transferFunction[dragIndex].alpha = alpha;
          }
          this.updateAlphaRange();
          this.sendUpdate();
          this.draw();
        }, { signal: abortController.signal });
      }
    };

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        // Left click
        checkDragStart(e);
      }

      if (isDragging) {
        return;
      }

      if (e.button === 0) {
        // Left click
        const { stop, alpha } = this.pixelToNormalized(e.offsetX, e.offsetY);
        this.addControlPoint(stop, alpha);
        checkDragStart(e);
      } else if (e.button === 1) {
        // Middle click
        e.preventDefault();
        this.removeControlPointAt(e.offsetX, e.offsetY);
      }
    });

    document.addEventListener("mouseup", () => {
      if (isDragging && abortController) {
        abortController.abort();
        abortController = null;
        isDragging = false;
        dragIndex = -1;
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      this.canvas.width = this.container.clientWidth;
      this.canvas.height = this.container.clientHeight;
      this.draw();
    });
    resizeObserver.observe(this.container);
  }
}

export interface TransparencyEditorOptions {
  initialTransferFunction?: Array<AlphaStop>;
  initialColorMap?: ColorMap;

  controlPointSize?: number;

  showAlphaGrid?: boolean;
  alphaGridSize?: number;
}