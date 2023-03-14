import * as d3Scale from "d3-scale";
import {ColorStop} from "./Types";
import * as d3Interpolate from "d3-interpolate";
import {ColorPicker} from "./ColorPicker";

export class ColorMapEditor {
    private container: HTMLElement;
    private readonly canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private colorRange: d3Scale.ScaleLinear<string, string>;

    private colorMap: Array<ColorStop>;

    private isDragging: boolean = false;
    private dragIndex: number = -1;
    private controlPointSize: number = 7;

    private colorPickerContainer: HTMLDivElement;
    private colorPicker: ColorPicker;

    private callback: (colorMap: Array<ColorStop>) => void = () => {
    };

    constructor(container: HTMLElement | string, colorMap: Array<ColorStop> = [
        {stop: 0, rgb: 'blue'},
        {stop: 0.5, rgb: 'white'},
        {stop: 1, rgb: 'red'}
    ]) {
        if (container) {
            if (typeof (container) === "string") {
                this.container = document.querySelector(container);
            } else {
                this.container = container;
            }
        } else {
            throw "No element given!"
        }

        this.container.classList.add("tfe-color-map-editor");

        this.colorMap = colorMap;
        this.updateColorRange();

        this.canvas = document.createElement("canvas");
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;

        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d", {alpha: false});

        this.colorPickerContainer = document.createElement("div");
        this.colorPickerContainer.classList.add("tfe-color-map-editor-color-picker-container");
        this.colorPickerContainer.style.width = "450px";
        this.colorPickerContainer.style.height = "275px";
        this.colorPickerContainer.style.backgroundColor = "white";
        this.colorPickerContainer.style.border = "1px solid black";
        this.colorPickerContainer.style.visibility = "hidden";
        this.colorPickerContainer.style.position = "relative";
        this.colorPickerContainer.style.bottom = `${this.canvas.height / 2}px`;
        this.container.appendChild(this.colorPickerContainer);
        this.colorPicker = new ColorPicker(this.colorPickerContainer);

        this.draw();
        this.addEventListeners();
    }

    public setColorMap(colorMap: Array<ColorStop>) {
        this.colorMap = colorMap;
        this.updateColorRange();
        this.draw();
        this.callback(this.colorMap);
    }

    public getColorMap(): Array<ColorStop> {
        return this.colorMap;
    }

    public onUpdate(callback: (colorMap: Array<ColorStop>) => void) {
        this.callback = callback;
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
        this.colorRange = d3Scale.scaleLinear<string, number>()
            .domain(this.colorMap.map(entry => entry.stop))
            .range(this.colorMap.map(entry => entry.rgb))
            .interpolate(d3Interpolate.interpolateHslLong)
    }

    private addEventListeners() {
        let draggedBefore = false;

        const checkDragStart = (e: { offsetX: number, offsetY: number }) => {
            this.dragIndex = -1;
            for (let i = 0; i < this.colorMap.length; i++) {
                const stop = this.colorMap[i];
                const dx = Math.abs(stop.stop * this.canvas.width - e.offsetX);
                if (dx < this.controlPointSize) {
                    this.dragIndex = i;
                    this.isDragging = true;
                    break;
                }
            }
        }

        this.canvas.addEventListener("mousedown", (e) => {
            draggedBefore = false;
            if (e.button === 0) { // Left click
                checkDragStart(e);
            }

            if (this.isDragging) {
                return;
            }

            const x = Math.max(0, Math.min(1, e.offsetX / this.canvas.width));
            if (e.button === 0) { // Left click
                const rgb = this.colorRange(x);
                const stop = {stop: x, rgb};
                this.colorMap.push(stop);
                this.colorMap.sort((a, b) => a.stop - b.stop);
                this.updateColorRange();
                this.draw();
                this.callback(this.colorMap);
                checkDragStart(e);
            } else if (e.button === 1) { // Middle click
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
                    this.callback(this.colorMap);
                }
            }
        });

        this.canvas.addEventListener("mousemove", (e) => {
            if (this.isDragging && this.dragIndex !== -1) {
                const x = Math.max(0, Math.min(1, e.offsetX / this.canvas.width));

                if (this.dragIndex !== 0 && this.dragIndex !== this.colorMap.length - 1) {
                    this.colorMap[this.dragIndex].stop = x;
                }

                this.colorMap.sort((a, b) => a.stop - b.stop);
                this.updateColorRange();
                this.draw();
                this.callback(this.colorMap);
                draggedBefore = true;
            }
        });

        this.canvas.addEventListener("mouseup", (e) => {
            this.isDragging = false;
            this.dragIndex = -1;
        });

        this.canvas.addEventListener("mouseleave", (e) => {
            if (this.isDragging && this.dragIndex !== -1) {
                const x = Math.max(0 + Number.EPSILON, Math.min(1 - Number.EPSILON, e.offsetX / this.canvas.width));

                if (this.dragIndex !== 0 && this.dragIndex !== this.colorMap.length - 1) {
                    this.colorMap[this.dragIndex].stop = x;
                }

                this.colorMap.sort((a, b) => a.stop - b.stop);
                this.updateColorRange();
                this.draw();
                this.callback(this.colorMap);
                this.isDragging = false;
                this.dragIndex = -1;
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
                const dx = stop.stop * this.canvas.width - e.offsetX;
                const dy = 0.5 * this.canvas.height - e.offsetY;
                if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
                    break;
                }
            }

            if (stop !== null) {
                const x = stop.stop * this.canvas.width;

                this.colorPickerContainer.style.left = `${x}px`;
                this.colorPickerContainer.style.visibility = "visible";
                this.colorPicker.onChange(() => {});
                this.colorPicker.setHEX(stop.rgb);
                this.colorPicker.onChange(newColor => {
                    stop.rgb = newColor.hex;
                    this.updateColorRange();
                    this.draw();
                    this.callback(this.colorMap);
                })
            }
        });

        this.colorPickerContainer.addEventListener("click", e => e.stopPropagation());

        document.addEventListener("click", () => {
            this.colorPickerContainer.style.visibility = "hidden";
        });
    }
}