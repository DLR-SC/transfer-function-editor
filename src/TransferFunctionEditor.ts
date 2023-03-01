import {interpolateNumber, interpolateRgb} from 'd3-interpolate';
import {rgb, color} from 'd3-color';
import {scaleLinear} from "d3-scale";

export class TransferFunctionEditor {
    private container: HTMLElement;
    private readonly canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private controlPoints: { x: number; y: number }[];
    private colorMap: { x: number, color: string }[] = [
        {x: 0, color: 'blue'},
        {x: 0.5, color: 'white'},
        {x: 1, color: 'red'}
    ];

    private isDragging: boolean = false;
    private dragIndex: number = -1;

    constructor(container: HTMLElement | string, transferFunction: number[] = [0, 0.5, 1]) {
        if (container) {
            if (typeof (container) == "string") {
                this.container = document.querySelector(container);
            } else {
                this.container = container;
            }
        } else {
            throw "No element given!"
        }
        this.controlPoints = [];
        for (let i = 0; i < transferFunction.length; i++) {
            const x = i / (transferFunction.length - 1);
            const y = 1 - transferFunction[i];
            this.controlPoints.push({x, y});
        }
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
        // find control points
        let cp1;
        let cp2;
        for (let i = 0; i < this.colorMap.length; i++) {
            if (this.colorMap[i].x === x) {
                return this.colorMap[i].color;
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

        const color1 = cp1.color;
        const color2 = cp2.color;
        const x1 = cp1.x;
        const x2 = cp2.x;

        return interpolateRgb(color1, color2)((x - x1) / (x2 - x1));
    }

    public getAlpha(x: number): number {
        // find control points
        let cp1;
        let cp2;
        for (let i = 0; i < this.controlPoints.length; i++) {
            if (this.controlPoints[i].x === x) {
                return this.controlPoints[i].y;
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

        const alpha1 = cp1.y;
        const alpha2 = cp2.y;
        const x1 = cp1.x;
        const x2 = cp2.x;

        return interpolateNumber(alpha1, alpha2)((x - x1) / (x2 - x1));
    }

    public getRGBA(x: number): string {
        const color = rgb(this.getRGB(x));
        const a = this.getAlpha(x);
        color.opacity = 1 - a;
        return color.formatHex8();
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const polygon = [{x: 0, y: 1}, ...this.controlPoints, {x: 1, y: 1}];
        const gradient = this.ctx.createLinearGradient(0, this.canvas.height, this.canvas.width, this.canvas.height);

        if (this.colorMap && this.colorMap.length > 0) {
            const gradientStops = [...this.colorMap.map((entry) => entry.x), ...this.controlPoints.map(entry => entry.x)].sort();
            for (const x of gradientStops) {
                gradient.addColorStop(x, this.getRGBA(x));
            }
        } else {
            for (const controlPoint of this.controlPoints) {
                gradient.addColorStop(controlPoint.x, `rgba(0, 0, 0, ${1 - controlPoint.y})`);
            }
        }

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        for (let i = 0; i < polygon.length; i++) {
            const x = polygon[i].x * this.canvas.width;
            const y = polygon[i].y * this.canvas.height;
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
            const y = this.controlPoints[i].y * this.canvas.height;
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
            const y = this.controlPoints[i].y * this.canvas.height;
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
                const dy = controlPoint.y * this.canvas.height - e.offsetY;
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
                const controlPoint = {x, y};
                this.controlPoints.push(controlPoint);
                this.controlPoints.sort((a, b) => a.x - b.x);
                this.draw();
                checkDragStart(e);
            } else if (e.button === 1) { // Middle click
                const x = Math.max(0, Math.min(1, e.offsetX / this.canvas.width));
                let indexToDelete = -1;
                for (let i = 1; i < this.controlPoints.length - 1; i++) {
                    if (Math.abs(this.controlPoints[i].x - x) < 0.03) {
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
                    this.controlPoints[this.dragIndex].y = y;
                } else if (this.dragIndex === this.controlPoints.length - 1) {
                    this.controlPoints[this.dragIndex].y = y;
                } else {
                    this.controlPoints[this.dragIndex].x = x;
                    this.controlPoints[this.dragIndex].y = y;
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

export class ColorMap {
    private container: HTMLElement;
    private readonly canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private colorMap: { x: number, color: string }[];

    private isDragging: boolean = false;
    private dragIndex: number = -1;

    constructor(container: HTMLElement | string, colorMap: { x: number, color: string }[] = [
        {x: 0, color: 'blue'},
        {x: 0.5, color: 'white'},
        {x: 1, color: 'red'}
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

        this.colorMap = colorMap;

        this.canvas = document.createElement("canvas");
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;

        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");

        this.draw();
        this.addEventListeners();
    }

    private draw() {
        const colorRange = scaleLinear<string, number>()
            .domain(this.colorMap.map(entry => entry.x))
            .range(this.colorMap.map(entry => entry.color))
            .interpolate(interpolateRgb)

        for (let i = 0; i < 512; ++i) {
            this.ctx.fillStyle = colorRange(i / (512 - 1));
            this.ctx.fillRect(i, 0, 1, this.canvas.height);
        }
    }

    private addEventListeners() {
        // implement
    }
}