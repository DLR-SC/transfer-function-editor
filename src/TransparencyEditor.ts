import {AlphaStop, ColorStop} from "./Types";
import * as d3Scale from "d3-scale";
import * as d3Color from "d3-color";
import * as d3Interpolate from "d3-interpolate";

export class TransparencyEditor {
    private container: HTMLElement;
    private readonly canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private controlPoints: Array<AlphaStop>;

    private alphaRange: d3Scale.ScaleLinear<number, number>;

    private colorRange: d3Scale.ScaleLinear<string, string>;
    private colorMap: Array<ColorStop> = [
        {stop: 0, rgb: 'blue'},
        {stop: 0.5, rgb: 'white'},
        {stop: 1, rgb: 'red'}
    ];

    private isDragging: boolean = false;
    private dragIndex: number = -1;
    private controlPointSize: number = 5;


    constructor(container: HTMLElement | string, transferFunction: Array<AlphaStop> = [
        {stop: 0, alpha: 1},
        {stop: 0.5, alpha: 0.5},
        {stop: 1, alpha: 0}
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

        this.container.classList.add("tfe-transparency-editor");

        this.controlPoints = transferFunction;
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.canvas.style.imageRendering = "pixelated";
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
        this.updateColorRange();
        this.updateAlphaRange();
        this.draw();
        this.addEventListeners();
    }

    public getRGB(stop: number): string {
        return this.colorRange(stop);
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
        this.controlPoints.push({stop, alpha});
        this.sortControlPoints();
        this.updateAlphaRange();
        this.draw();
    }

    public removeControlPointAt(x, y): void {
        let indexToDelete = -1;
        for (let i = 1; i < this.controlPoints.length - 1; i++) {
            const controlPoint = this.controlPoints[i];
            const dx = controlPoint.stop * this.canvas.width - x;
            const dy = controlPoint.alpha * this.canvas.height - y;
            if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
                indexToDelete = i;
                break;
            }
        }
        if (indexToDelete !== -1) {
            this.controlPoints.splice(indexToDelete, 1);
            this.updateAlphaRange();
            this.draw();
        }
    }

    public moveControlPointTo(): void {

    }

    public setColorMap(colorMap: Array<ColorStop>) {
        this.colorMap = colorMap;
        this.updateColorRange();
        this.draw();
    }

    private updateColorRange() {
        this.colorRange = d3Scale.scaleLinear<string, number>()
            .domain(this.colorMap.map(entry => entry.stop))
            .range(this.colorMap.map(entry => entry.rgb))
            .interpolate(d3Interpolate.interpolateRgb)
    }

    private updateAlphaRange() {
        this.alphaRange = d3Scale.scaleLinear<number, number>()
            .domain(this.controlPoints.map(entry => entry.stop))
            .range(this.controlPoints.map(entry => entry.alpha))
            .interpolate(d3Interpolate.interpolateNumber)
    }

    private draw() {
        // Clear the drawing area.
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the color gradient.
        for (let i = 0; i < this.canvas.width; ++i) {
            const alpha = this.getAlpha(i / (this.canvas.width - 1));
            this.ctx.fillStyle = this.getRGBA(i / (this.canvas.width - 1));
            this.ctx.fillRect(i, alpha * this.canvas.height, 1, (1 - alpha) * this.canvas.height);
        }

        // Draw the lines between points.
        this.ctx.strokeStyle = "black";
        this.ctx.beginPath();
        for (let i = 0; i < this.controlPoints.length; i++) {
            const x = this.controlPoints[i].stop * this.canvas.width;
            const y = this.controlPoints[i].alpha * this.canvas.height;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw the control points.
        this.ctx.fillStyle = "white";
        for (let i = 0; i < this.controlPoints.length; i++) {
            const x = this.controlPoints[i].stop * this.canvas.width;
            const y = this.controlPoints[i].alpha * this.canvas.height;
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.controlPointSize, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    private sortControlPoints() {
        this.controlPoints.sort((a, b) => a.stop - b.stop);
    }

    private pixelToNormalized(x: number, y: number): { stop: number, alpha: number } {
        const stop = Math.max(0, Math.min(1, x / this.canvas.width));
        const alpha = Math.max(0, Math.min(1, y / this.canvas.height));
        return {stop, alpha};
    }

    private addEventListeners() {
        const checkDragStart = (e: { offsetX: number, offsetY: number }) => {
            this.dragIndex = -1;
            for (let i = 0; i < this.controlPoints.length; i++) {
                const controlPoint = this.controlPoints[i];
                const dx = controlPoint.stop * this.canvas.width - e.offsetX;
                const dy = controlPoint.alpha * this.canvas.height - e.offsetY;
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

            if (e.button === 0) { // Left click
                const {stop, alpha} = this.pixelToNormalized(e.offsetX, e.offsetY);
                this.addControlPoint(stop, alpha);
                checkDragStart(e);
            } else if (e.button === 1) { // Middle click
                this.removeControlPointAt(e.offsetX, e.offsetY);
            }
        });

        this.canvas.addEventListener("mousemove", (e) => {
            if (this.isDragging && this.dragIndex !== -1) {
                const {stop, alpha} = this.pixelToNormalized(e.offsetX, e.offsetY);

                if (this.dragIndex === 0) {
                    this.controlPoints[this.dragIndex].alpha = alpha;
                } else if (this.dragIndex === this.controlPoints.length - 1) {
                    this.controlPoints[this.dragIndex].alpha = alpha;
                } else {
                    this.controlPoints[this.dragIndex].stop = stop;
                    this.controlPoints[this.dragIndex].alpha = alpha;
                }
                this.sortControlPoints();
                this.updateAlphaRange();
                this.draw();
            }
        });

        this.canvas.addEventListener("mouseup", () => {
            this.isDragging = false;
            this.dragIndex = -1;
        });

        this.canvas.addEventListener("mouseleave", (e) => {
            if (this.isDragging) {
                const controlPoint = this.controlPoints[this.dragIndex];
                if (e.offsetY < 0) {
                    controlPoint.alpha = 0;
                } else if (e.offsetY > this.canvas.height) {
                    controlPoint.alpha = 1;
                }

                if (e.offsetX < 0 && this.dragIndex > 0) {
                    controlPoint.stop = (this.dragIndex + 1) * Number.EPSILON;
                } else if (e.offsetX > this.canvas.width && this.dragIndex < this.controlPoints.length - 1) {
                    controlPoint.stop = 1 - (this.controlPoints.length - this.dragIndex) * Number.EPSILON;
                }

                this.isDragging = false;
                this.dragIndex = -1;

                this.sortControlPoints();
                this.updateAlphaRange();
                this.draw();
            }
        });
    }
}