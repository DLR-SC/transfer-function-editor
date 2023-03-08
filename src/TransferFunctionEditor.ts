import * as d3Interpolate from 'd3-interpolate';
import * as d3Color from 'd3-color';
import * as d3Scale from "d3-scale";

export class TransferFunctionEditor {
    private container: HTMLElement;

    private transparencyEditor: TransparencyEditor;

    private colorMapEditor: ColorMapEditor;

    constructor(container: HTMLElement | string) {
        if (container) {
            if (typeof (container) == "string") {
                this.container = document.querySelector(container);
            } else {
                this.container = container;
            }
        } else {
            throw "No element given!"
        }

        this.container.classList.add("transfer-function-editor");

        const transparencyEditorElement = document.createElement("div");
        transparencyEditorElement.style.width = "100%";
        transparencyEditorElement.style.minHeight = "50px";
        this.container.append(transparencyEditorElement);
        this.transparencyEditor = new TransparencyEditor(transparencyEditorElement);

        const colorMapEditorElement = document.createElement("div");
        colorMapEditorElement.style.width = "100%";
        colorMapEditorElement.style.minHeight = "10px";
        this.container.append(colorMapEditorElement);
        this.colorMapEditor = new ColorMapEditor(colorMapEditorElement);

        this.colorMapEditor.onUpdate((colorMap) => this.transparencyEditor.setColorMap(colorMap));
    }
}

export interface AlphaStop {
    stop: number;
    alpha: number;
}

export class TransparencyEditor {
    private container: HTMLElement;
    private readonly canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private controlPoints: Array<AlphaStop>;

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
            if (typeof (container) == "string") {
                this.container = document.querySelector(container);
            } else {
                this.container = container;
            }
        } else {
            throw "No element given!"
        }

        this.container.classList.add("transparency-editor");

        this.controlPoints = transferFunction;
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.canvas.style.imageRendering = "pixelated";
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
        this.updateColorRange();
        this.draw();
        this.addEventListeners();
    }

    public getRGB(stop: number): string {
        return this.colorRange(stop);
        /*let cp1: ColorStop;
        let cp2: ColorStop;
        for (let i = 0; i < this.colorMap.length; i++) {
            if (this.colorMap[i].stop === stop) {
                return this.colorMap[i].rgb;
            }

            if (stop < this.colorMap[i].stop) {
                cp1 = this.colorMap[i - 1];
                cp2 = this.colorMap[i];
                break;
            }
        }

        if (!cp1 || !cp2) {
            throw "Parameter 'stop' is not in the range [0, 1]!";
        }

        const color1 = cp1.rgb;
        const color2 = cp2.rgb;
        const x1 = cp1.stop;
        const x2 = cp2.stop;

        return d3Interpolate.interpolateRgb(color1, color2)((stop - x1) / (x2 - x1));*/
    }

    public getAlpha(stop: number): number {
        // find control points
        let cp1: AlphaStop;
        let cp2: AlphaStop;
        for (let i = 0; i < this.controlPoints.length; i++) {
            if (this.controlPoints[i].stop === stop) {
                return this.controlPoints[i].alpha;
            }

            if (stop < this.controlPoints[i].stop) {
                cp1 = this.controlPoints[i - 1];
                cp2 = this.controlPoints[i];
                break;
            }
        }

        if (!cp1 || !cp2) {
            throw "Parameter 'stop' is not in the range [0, 1]!";
        }

        const alpha1 = cp1.alpha;
        const alpha2 = cp2.alpha;
        const x1 = cp1.stop;
        const x2 = cp2.stop;

        return d3Interpolate.interpolateNumber(alpha1, alpha2)((stop - x1) / (x2 - x1));
    }

    public getRGBA(stop: number): string {
        const color = d3Color.rgb(this.getRGB(stop));
        const a = this.getAlpha(stop);
        color.opacity = 1 - a;
        return color.formatHex8();
    }

    public addControlPointAt(x, alpha) {
        this.controlPoints.push({stop: x, alpha});
        this.sortControlPoints();
        this.draw();
    }

    public removeControlPointAt(x, y) {

    }

    public moveControlPointTo() {

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

    private draw() {
        // Clear the drawing area.
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the color gradient.
        for (let i = 0; i < this.canvas.width; ++i) {
            const alpha = this.getAlpha(i / (this.canvas.width - 1));
            this.ctx.fillStyle = this.getRGBA(i / (this.canvas.width - 1)); //this.colorRange(i / (this.canvas.width - 1));
            this.ctx.fillRect(i, alpha * this.canvas.height, 1,  (1 - alpha) * this.canvas.height);
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

    private controlPointAt(stop: number, alpha: number) {

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
                const x = Math.max(0, Math.min(1, e.offsetX / this.canvas.width));
                const y = Math.max(0, Math.min(1, e.offsetY / this.canvas.height));
                this.addControlPointAt(x, y);
                checkDragStart(e);
            } else if (e.button === 1) { // Middle click
                let indexToDelete = -1;
                for (let i = 1; i < this.controlPoints.length - 1; i++) {
                    const controlPoint = this.controlPoints[i];
                    const dx = controlPoint.stop * this.canvas.width - e.offsetX;
                    const dy = controlPoint.alpha * this.canvas.height - e.offsetY;
                    if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
                        indexToDelete = i;
                        break;
                    }
                }
                if (indexToDelete !== -1) {
                    this.controlPoints.splice(indexToDelete, 1);
                    this.draw();
                }
            }
        });

        this.canvas.addEventListener("mousemove", (e) => {
            if (this.isDragging && this.dragIndex !== -1) {
                const x = Math.max(0, Math.min(1, e.offsetX / this.canvas.width));
                const y = Math.max(0, Math.min(1, e.offsetY / this.canvas.height));

                if (this.dragIndex === 0) {
                    this.controlPoints[this.dragIndex].alpha = y;
                } else if (this.dragIndex === this.controlPoints.length - 1) {
                    this.controlPoints[this.dragIndex].alpha = y;
                } else {
                    this.controlPoints[this.dragIndex].stop = x;
                    this.controlPoints[this.dragIndex].alpha = y;
                }

                this.sortControlPoints();
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
                this.draw();
            }
        });
    }
}

export interface ColorStop {
    stop: number;
    rgb: string;
}

export class ColorMapEditor {
    private container: HTMLElement;
    private readonly canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private colorRange: d3Scale.ScaleLinear<string, string>;

    private colorMap: Array<ColorStop>;

    private isDragging: boolean = false;
    private dragIndex: number = -1;
    private controlPointSize: number = 5;

    private callback: (colorMap: Array<ColorStop>) => void = () => {};

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