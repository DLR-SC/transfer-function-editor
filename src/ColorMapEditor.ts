import * as d3Scale from "d3-scale";
import {ColorStop} from "./Types";
import * as d3Interpolate from "d3-interpolate";

export class ColorMapEditor {
    private container: HTMLElement;
    private readonly canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private colorRange: d3Scale.ScaleLinear<string, string>;

    private colorMap: Array<ColorStop>;

    private isDragging: boolean = false;
    private dragIndex: number = -1;
    private controlPointSize: number = 5;

    private callback: (colorMap: Array<ColorStop>) => void = () => {
    };

    constructor(container: HTMLElement | string, colorMap: Array<ColorStop> = [
        {stop: 0, rgb: 'blue'},
        {stop: 0.5, rgb: 'white'},
        {stop: 1, rgb: 'red'}
    ]) {
        if (container) {
            if (typeof (container) == "string") {
                this.container = document.querySelector(container);
            } else {
                this.container = container;
            }
        } else {
            throw "No element given!"
        }

        this.container.classList.add("color-map-editor");

        this.colorMap = colorMap;
        this.updateColorRange();

        this.canvas = document.createElement("canvas");
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;

        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");

        this.draw();
        this.addEventListeners();
    }

    public onUpdate(callback: (colorMap: Array<ColorStop>) => void) {
        this.callback = callback;
    }

    private draw() {
        for (let i = 0; i < this.canvas.width; ++i) {
            this.ctx.fillStyle = this.colorRange(i / (this.canvas.width - 1));
            this.ctx.fillRect(i, 0, 1, this.canvas.height);
        }

        this.ctx.strokeStyle = "black";
        for (let i = 0; i < this.colorMap.length; i++) {
            this.ctx.fillStyle = this.colorMap[i].rgb;
            const x = this.colorMap[i].stop * this.canvas.width;
            const y = 0.5 * this.canvas.height;
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.controlPointSize, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    private updateColorRange() {
        this.colorRange = d3Scale.scaleLinear<string, number>()
            .domain(this.colorMap.map(entry => entry.stop))
            .range(this.colorMap.map(entry => entry.rgb))
            .interpolate(d3Interpolate.interpolateRgb)
    }

    private addEventListeners() {
        const checkDragStart = (e: { offsetX: number, offsetY: number }) => {
            this.dragIndex = -1;
            for (let i = 0; i < this.colorMap.length; i++) {
                const stop = this.colorMap[i];
                const dx = stop.stop * this.canvas.width - e.offsetX;
                const dy = 0.5 * this.canvas.height - e.offsetY;
                if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
                    this.dragIndex = i;
                    this.isDragging = true;
                    break;
                }
            }
        }

        this.canvas.addEventListener("mousedown", (e) => {
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
            }
        });

        this.canvas.addEventListener("mouseup", () => {
            this.isDragging = false;
            this.dragIndex = -1;
        });
    }
}