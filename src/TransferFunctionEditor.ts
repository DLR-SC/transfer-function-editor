import * as d3Interpolate from 'd3-interpolate';
import * as d3Color from 'd3-color';
import * as d3Scale from "d3-scale";

export class TransferFunctionEditor {
    private container: HTMLElement;

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

    }
}

export class TransparencyEditor {
    private container: HTMLElement;
    private readonly canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private controlPoints: Array<{ x: number; alpha: number }>;
    private colorMap: Array<{ x: number, rgb: string }> = [
        {x: 0, rgb: 'blue'},
        {x: 0.5, rgb: 'white'},
        {x: 1, rgb: 'red'}
    ];

    private isDragging: boolean = false;
    private dragIndex: number = -1;

    constructor(container: HTMLElement | string, transferFunction: Array<{ x: number; alpha: number }> = [
        {x: 0, alpha: 1},
        {x: 0.5, alpha: 0.5},
        {x: 1, alpha: 0}
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
        this.draw();
        this.addEventListeners();
    }

    public getRGB(x: number): string {
        let cp1: {x: number, rgb: string};
        let cp2: {x: number, rgb: string};
        for (let i = 0; i < this.colorMap.length; i++) {
            if (this.colorMap[i].x === x) {
                return this.colorMap[i].rgb;
            }

            if (x < this.colorMap[i].x) {
                cp1 = this.colorMap[i - 1];
                cp2 = this.colorMap[i];
                break;
            }
        }

        if (!cp1 || !cp2) {
            throw "Parameter 'x' is not in the range [0, 1]!";
        }

        const color1 = cp1.rgb;
        const color2 = cp2.rgb;
        const x1 = cp1.x;
        const x2 = cp2.x;

        return d3Interpolate.interpolateRgb(color1, color2)((x - x1) / (x2 - x1));
    }

    public getAlpha(x: number): number {
        // find control points
        let cp1: {x: number, alpha: number};
        let cp2: {x: number, alpha: number};
        for (let i = 0; i < this.controlPoints.length; i++) {
            if (this.controlPoints[i].x === x) {
                return this.controlPoints[i].alpha;
            }

            if (x < this.controlPoints[i].x) {
                cp1 = this.controlPoints[i - 1];
                cp2 = this.controlPoints[i];
                break;
            }
        }

        if (!cp1 || !cp2) {
            throw "Parameter 'x' is not in the range [0, 1]!";
        }

        const alpha1 = cp1.alpha;
        const alpha2 = cp2.alpha;
        const x1 = cp1.x;
        const x2 = cp2.x;

        return d3Interpolate.interpolateNumber(alpha1, alpha2)((x - x1) / (x2 - x1));
    }

    public getRGBA(x: number): string {
        const color = d3Color.rgb(this.getRGB(x));
        const a = this.getAlpha(x);
        color.opacity = 1 - a;
        return color.formatHex8();
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const polygon = [{x: 0, alpha: 1}, ...this.controlPoints, {x: 1, alpha: 1}];
        const gradient = this.ctx.createLinearGradient(0, this.canvas.height, this.canvas.width, this.canvas.height);

        if (this.colorMap && this.colorMap.length > 0) {
            const gradientStops = [...this.colorMap.map((entry) => entry.x), ...this.controlPoints.map((entry) => entry.x)].sort();
            for (const x of gradientStops) {
                gradient.addColorStop(x, this.getRGBA(x));
            }
        } else {
            for (const controlPoint of this.controlPoints) {
                gradient.addColorStop(controlPoint.x, `rgba(0, 0, 0, ${1 - controlPoint.alpha})`);
            }
        }

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        for (let i = 0; i < polygon.length; i++) {
            const x = polygon[i].x * this.canvas.width;
            const y = polygon[i].alpha * this.canvas.height;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.strokeStyle = "black";
        this.ctx.beginPath();
        for (let i = 0; i < this.controlPoints.length; i++) {
            const x = this.controlPoints[i].x * this.canvas.width;
            const y = this.controlPoints[i].alpha * this.canvas.height;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        this.ctx.fillStyle = "white";
        for (let i = 0; i < this.controlPoints.length; i++) {
            const x = this.controlPoints[i].x * this.canvas.width;
            const y = this.controlPoints[i].alpha * this.canvas.height;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    private addEventListeners() {
        const checkDragStart = (e: { offsetX: number, offsetY: number }) => {
            this.dragIndex = -1;
            for (let i = 0; i < this.controlPoints.length; i++) {
                const controlPoint = this.controlPoints[i];
                const dx = controlPoint.x * this.canvas.width - e.offsetX;
                const dy = controlPoint.alpha * this.canvas.height - e.offsetY;
                if (Math.sqrt(dx * dx + dy * dy) < 5) {
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
                const controlPoint = {x, alpha: y};
                this.controlPoints.push(controlPoint);
                this.controlPoints.sort((a, b) => a.x - b.x);
                this.draw();
                checkDragStart(e);
            } else if (e.button === 1) { // Middle click
                let indexToDelete = -1;
                for (let i = 1; i < this.controlPoints.length - 1; i++) {
                    const controlPoint = this.controlPoints[i];
                    const dx = controlPoint.x * this.canvas.width - e.offsetX;
                    const dy = controlPoint.alpha * this.canvas.height - e.offsetY;
                    if (Math.sqrt(dx * dx + dy * dy) < 5) {
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
                    this.controlPoints[this.dragIndex].x = x;
                    this.controlPoints[this.dragIndex].alpha = y;
                }

                this.controlPoints.sort((a, b) => a.x - b.x);
                this.draw();
            }
        });

        this.canvas.addEventListener("mouseup", () => {
            this.isDragging = false;
            this.dragIndex = -1;
        });
    }
}

export class ColorMapEditor {
    private container: HTMLElement;
    private readonly canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private colorRange: d3Scale.ScaleLinear<string, string>;

    private colorMap: Array<{ x: number, rgb: string }>;

    private isDragging: boolean = false;
    private dragIndex: number = -1;

    constructor(container: HTMLElement | string, colorMap: Array<{ x: number, rgb: string }> = [
        {x: 0, rgb: 'blue'},
        {x: 0.5, rgb: 'white'},
        {x: 1, rgb: 'red'}
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

    private draw() {

        for (let i = 0; i < 512; ++i) {
            this.ctx.fillStyle = this.colorRange(i / (512 - 1));
            this.ctx.fillRect(i, 0, 1, this.canvas.height);
        }

        this.ctx.strokeStyle = "black";
        for (let i = 0; i < this.colorMap.length; i++) {
            this.ctx.fillStyle = this.colorMap[i].rgb;
            const x = this.colorMap[i].x * this.canvas.width;
            const y = 0.5 * this.canvas.height;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    private updateColorRange() {
        this.colorRange = d3Scale.scaleLinear<string, number>()
            .domain(this.colorMap.map(entry => entry.x))
            .range(this.colorMap.map(entry => entry.rgb))
            .interpolate(d3Interpolate.interpolateRgb)
    }

    private addEventListeners() {
        const checkDragStart = (e: { offsetX: number, offsetY: number }) => {
            this.dragIndex = -1;
            for (let i = 0; i < this.colorMap.length; i++) {
                const stop = this.colorMap[i];
                const dx = stop.x * this.canvas.width - e.offsetX;
                const dy = 0.5 * this.canvas.height - e.offsetY;
                if (Math.sqrt(dx * dx + dy * dy) < 5) {
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
                const stop = {x, rgb};
                this.colorMap.push(stop);
                this.colorMap.sort((a, b) => a.x - b.x);
                this.updateColorRange();
                this.draw();
                checkDragStart(e);
            } else if (e.button === 1) { // Middle click
                let indexToDelete = -1;
                for (let i = 1; i < this.colorMap.length - 1; i++) {
                    const stop = this.colorMap[i];
                    const dx = stop.x * this.canvas.width - e.offsetX;
                    const dy = 0.5 * this.canvas.height - e.offsetY;
                    if (Math.sqrt(dx * dx + dy * dy) < 5) {
                        indexToDelete = i;
                        break;
                    }
                }
                if (indexToDelete !== -1) {
                    this.colorMap.splice(indexToDelete, 1);
                    this.updateColorRange();
                    this.draw();
                }
            }
        });

        this.canvas.addEventListener("mousemove", (e) => {
            if (this.isDragging && this.dragIndex !== -1) {
                const x = Math.max(0, Math.min(1, e.offsetX / this.canvas.width));

                if (this.dragIndex !== 0 && this.dragIndex !== this.colorMap.length - 1) {
                    this.colorMap[this.dragIndex].x = x;
                }

                this.colorMap.sort((a, b) => a.x - b.x);
                this.updateColorRange();
                this.draw();
            }
        });

        this.canvas.addEventListener("mouseup", () => {
            this.isDragging = false;
            this.dragIndex = -1;
        });
    }
}