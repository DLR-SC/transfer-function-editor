import * as d3Scale from "d3-scale";
import { ColorStop } from "./Types";
import * as d3Interpolate from "d3-interpolate";
import { ColorPicker } from "./ColorPicker";

export class ColorMapEditor {
  private container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private colorRange: d3Scale.ScaleLinear<string, string>;

  private colorMap: Array<ColorStop>;

  private controlPointSize: number = 7;

  private colorPickerContainer: HTMLDivElement;
  private colorPicker: ColorPicker;

  private callbacks: Map<number, (colorMap: Array<ColorStop>) => void> = new Map();
  private callbackCounter = 0;

  constructor(container: HTMLElement | string, options?: ColorMapEditorOptions) {
    if (container) {
      if (typeof container === "string") {
        this.container = document.querySelector(container);
      } else {
        this.container = container;
      }
    } else {
      throw "No element given!";
    }

    const defaultOptions: ColorMapEditorOptions = {
      initialColorMap: [
        { stop: 0, rgb: "blue" },
        { stop: 0.5, rgb: "white" },
        { stop: 1, rgb: "red" }
      ]
    };
    const finalOptions = Object.assign(defaultOptions, options);

    this.colorMap = finalOptions.initialColorMap;

    this.container.classList.add("tfe-color-map-editor");
    this.updateColorRange();

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;

    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d", { alpha: false });

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

    this.draw();
    this.addEventListeners();
  }

  public setColorMap(colorMap: Array<ColorStop>) {
    this.colorMap = colorMap;
    this.updateColorRange();
    this.draw();
    this.sendUpdates();
  }

  public getColorMap(): Array<ColorStop> {
    return this.colorMap;
  }

  public addListener(callback: (colorMap: Array<ColorStop>) => void): number {
    const id = this.callbackCounter++;
    this.callbacks.set(id, callback);
    callback(this.colorMap);
    return id;
  }

  public removeListener(id: number) {
    this.callbacks.delete(id);
  }

  private sendUpdates() {
    this.callbacks.forEach((value) => value(this.colorMap));
  }

  private draw() {
    for (let i = 0; i < this.canvas.width; ++i) {
      this.ctx.fillStyle = this.colorRange(i / (this.canvas.width - 1));
      this.ctx.fillRect(i, 0, 1, this.canvas.height);
    }

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

  private updateColorRange() {
    this.colorRange = d3Scale
      .scaleLinear<string, number>()
      .domain(this.colorMap.map((entry) => entry.stop))
      .range(this.colorMap.map((entry) => entry.rgb))
      .interpolate(d3Interpolate.interpolateHslLong);
  }

  private addEventListeners() {
    let draggedBefore = false;
    let isDragging: boolean = false;
    let dragIndex: number = -1;
    let abortController: AbortController = null;

    const checkDragStart = (e: { offsetX: number; offsetY: number }) => {
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

    this.canvas.addEventListener("mousedown", (e) => {
      draggedBefore = false;
      if (e.button === 0) {
        // Left click
        checkDragStart(e);
      }

      if (isDragging) {
        return;
      }

      const x = Math.max(0, Math.min(1, e.offsetX / this.canvas.width));
      if (e.button === 0) {
        // Left click
        const rgb = this.colorRange(x);
        const stop = { stop: x, rgb };
        this.colorMap.push(stop);
        this.colorMap.sort((a, b) => a.stop - b.stop);
        this.updateColorRange();
        this.draw();
        this.sendUpdates();
        checkDragStart(e);
      } else if (e.button === 1) {
        // Middle click
        e.preventDefault();
        let indexToDelete = -1;
        for (let i = 1; i < this.colorMap.length - 1; i++) {
          const stop = this.colorMap[i];
          const dx = stop.stop * this.canvas.width - e.offsetX;
          const dy = 0.5 * this.canvas.height - e.offsetY;
          if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
            indexToDelete = i;
            break;
          }
        }
        if (indexToDelete !== -1) {
          this.colorMap.splice(indexToDelete, 1);
          this.updateColorRange();
          this.draw();
          this.sendUpdates();
        }
      }
    });

    document.addEventListener("mouseup", (e) => {
      if (isDragging && abortController) {
        abortController.abort();
        abortController = null;
        isDragging = false;
        dragIndex = -1;
      }
    });

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
        this.colorPicker.addListener(() => {
        });
        this.colorPicker.setHEX(stop.rgb);
        this.colorPicker.addListener((newColor) => {
          stop.rgb = newColor.hex;
          this.updateColorRange();
          this.draw();
          this.sendUpdates();
        });
      }
    });

    this.colorPickerContainer.addEventListener("click", (e) => e.stopPropagation());

    document.addEventListener("click", () => {
      this.colorPickerContainer.style.visibility = "hidden";
    });

    const resizeObserver = new ResizeObserver(() => {
      this.canvas.width = this.container.clientWidth;
      this.canvas.height = this.container.clientHeight;
      this.draw();
    });
    resizeObserver.observe(this.container);
  }
}

export interface ColorMapEditorOptions {
  initialColorMap?: Array<ColorStop>;
}