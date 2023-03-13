import {Color, hsl as d3HSL, rgb as d3RGB} from "d3-color";
import {hsv, hsv as d3HSV, HSVColor} from "d3-hsv";

export class ColorPicker {
    private container: HTMLElement;
    private showAlpha: boolean;
    private hsv: HSVColor;
    private readonly svCanvas: HTMLCanvasElement;
    private svContext: CanvasRenderingContext2D;
    private readonly hCanvas: HTMLCanvasElement;
    private hContext: CanvasRenderingContext2D;
    private readonly CANVAS_SIZE: number = 256;

    constructor(container: HTMLElement | string, showAlpha = false, initialColor: string = "#FFFFFF") {
        if (container) {
            if (typeof (container) === "string") {
                this.container = document.querySelector(container);
            } else {
                this.container = container;
            }
        } else {
            throw "No element given!"
        }

        this.hsv = d3HSV(initialColor);
        this.showAlpha = showAlpha;
        this.container.classList.add("tfe-color-picker");

        const rootContainer = document.createElement("div");
        rootContainer.classList.add("tfe-color-picker-root");
        rootContainer.style.width = "100%";
        rootContainer.style.height = "100%";
        rootContainer.style.display = "flex";
        rootContainer.style.padding = "12px";
        this.container.append(rootContainer);

        const svPickerContainer = document.createElement("div");
        svPickerContainer.classList.add("tfe-color-picker-sl-picker");
        svPickerContainer.style.width = `${this.CANVAS_SIZE}px`;
        svPickerContainer.style.height = `${this.CANVAS_SIZE}px`;
        rootContainer.append(svPickerContainer);

        this.svCanvas = document.createElement("canvas");
        this.svCanvas.width = svPickerContainer.clientWidth;
        this.svCanvas.height = svPickerContainer.clientHeight;

        svPickerContainer.appendChild(this.svCanvas);
        this.svContext = this.svCanvas.getContext("2d", {alpha: false});

        this.drawSVPicker();
        this.addSVEventListener();

        const hPickerContainer = document.createElement("div");
        hPickerContainer.classList.add("tfe-color-picker-h-picker");
        hPickerContainer.style.width = `24px`;
        hPickerContainer.style.height = `${this.CANVAS_SIZE}px`;
        hPickerContainer.style.paddingLeft = "12px";
        rootContainer.append(hPickerContainer);

        this.hCanvas = document.createElement("canvas");
        this.hCanvas.width = hPickerContainer.clientWidth;
        this.hCanvas.height = hPickerContainer.clientHeight;

        hPickerContainer.appendChild(this.hCanvas);
        this.hContext = this.hCanvas.getContext("2d", {alpha: false});

        this.drawHPicker();
        this.addHEventListener();
    }

    public setHEX(color: string) {
        this.hsv = d3HSV(color);
        this.drawAll();
    }

    public setRGB(r: number, g: number, b: number) {
        this.hsv = d3HSV(`rgb(${r * 255},${g * 255},${b * 255})`);
        this.drawAll();
    }

    public setRGBA(r: number, g: number, b: number, a: number) {
        this.hsv = d3HSV(`rgba(${r * 255},${g * 255},${b * 255},${1 - a})`);
        this.drawAll();
    }

    public setHSL(h: number, s: number, l: number) {
        this.hsv = d3HSV(`hsl(${h * 360} ${s * 100} ${l * 100})`);
        this.drawAll();
    }

    public setHSLA(h: number, s: number, l: number, a: number) {
        this.hsv = d3HSV(`hsla(${h * 360} ${s * 100} ${l * 100} ${1 - a})`);
        this.drawAll();
    }

    public setHSV(h: number, s: number, v: number) {
        this.hsv = d3HSV(h, s, v);
        this.drawAll();
    }

    public setHSVA(h: number, s: number, v: number, a: number) {
        this.hsv = d3HSV(h, s, v, 1 - a);
        this.drawAll();
    }

    public getHEX(): string {
        return this.formatHSVA(this.hsv);
    }

    public getRGB(): RGB {
        const rgb = this.hsv.rgb();
        return {r: rgb.r, g: rgb.g, b: rgb.b};
    }

    public getRGBA(): RGBA {
        const rgb = this.hsv.rgb();
        return {r: rgb.r, g: rgb.g, b: rgb.b, a: 1 - rgb.opacity};
    }

    public getHSL(): HSL {
        const hsl = d3HSL(this.hsv.formatHsl());
        return {h: hsl.h, s: hsl.s, l: hsl.l};
    }

    public getHSLA(): HSLA {
        const hsl = d3HSL(this.hsv.formatHsl());
        return {h: hsl.h, s: hsl.s, l: hsl.l, a: 1 - hsl.opacity};
    }

    public getHSV(): HSV {
        return {h: this.hsv.h, s: this.hsv.s, v: this.hsv.v};
    }

    public getHSVA(): HSVA {
        return {h: this.hsv.h, s: this.hsv.s, v: this.hsv.v, a: 1 - this.hsv.opacity};
    }

    private drawAll() {
        this.drawHPicker();
        this.drawSVPicker();
    }

    private drawSVPicker() {
        for (let x = 0; x < this.CANVAS_SIZE; x++) {
            const gradient = this.svContext.createLinearGradient(0, 0, 0, this.CANVAS_SIZE);
            gradient.addColorStop(0, d3HSV(this.hsv.h, x / this.CANVAS_SIZE, 1).formatHex())
            gradient.addColorStop(1, d3HSV(this.hsv.h, x / this.CANVAS_SIZE, 0).formatHex())

            this.svContext.fillStyle = gradient;
            this.svContext.fillRect(x, 0, 1, this.CANVAS_SIZE);
        }

        this.svContext.strokeStyle = "white";
        this.svContext.fillStyle = "transparent";
        const x = this.hsv.s * this.CANVAS_SIZE;
        const y = (1 - this.hsv.v) * this.CANVAS_SIZE;
        this.svContext.beginPath();
        this.svContext.arc(x, y, 5, 0, 2 * Math.PI);
        this.svContext.fill();
        this.svContext.stroke();
    }

    private drawHPicker() {
        const gradient = this.hContext.createLinearGradient(0, 0, 0, this.CANVAS_SIZE);
        gradient.addColorStop(0, "#ff0000");
        gradient.addColorStop(1 / 6, "#ffff00");
        gradient.addColorStop(1 / 3, "#00ff00");
        gradient.addColorStop(1 / 2, "#00ffff");
        gradient.addColorStop(2 / 3, "#0000ff");
        gradient.addColorStop(5 / 6, "#ff00ff");
        gradient.addColorStop(1, "#ff0000");
        this.hContext.fillStyle = gradient;
        this.hContext.fillRect(0, 0, this.hCanvas.width, this.hCanvas.height);

        this.hContext.strokeStyle = "black";
        this.hContext.fillStyle = "transparent";
        const x = this.hCanvas.width / 2;
        const y = (this.hsv.h / 360) * this.CANVAS_SIZE;
        this.hContext.beginPath();
        this.hContext.arc(x, y, 5, 0, 2 * Math.PI);
        this.hContext.fill();
        this.hContext.stroke();
    }

    private addSVEventListener() {
        let isDragging = false;

        const updateSV = (x, y) => {
            this.hsv.s = x / this.CANVAS_SIZE;
            this.hsv.v = 1 - y / this.CANVAS_SIZE;
            this.drawSVPicker();
        }

        this.svCanvas.addEventListener("mousedown", (e) => {
            isDragging = true;
            updateSV(e.offsetX, e.offsetY);
        });

        this.svCanvas.addEventListener("mousemove", (e) => {
            if (isDragging) {
                updateSV(e.offsetX, e.offsetY);
            }
        })

        this.svCanvas.addEventListener("mouseleave", (e) => isDragging = false);
        this.svCanvas.addEventListener("mouseup", (e) => isDragging = false);
    }

    private addHEventListener() {
        let isDragging = false;

        const updateH = (y) => {
            this.hsv.h = (y / this.CANVAS_SIZE) * 360;
            this.drawAll();
        }

        this.hCanvas.addEventListener("mousedown", (e) => {
            isDragging = true;
            updateH(e.offsetY);
        });

        this.hCanvas.addEventListener("mousemove", (e) => {
            if (isDragging) {
                updateH(e.offsetY);
            }
        })

        this.hCanvas.addEventListener("mouseleave", (e) => isDragging = false);
        this.hCanvas.addEventListener("mouseup", (e) => isDragging = false);
    }

    private formatHSVA(hsv: HSVColor): string {
        return d3HSL(hsv.toString()).formatHex8();
    }
}

interface RGB {
    r: number;
    g: number;
    b: number;
}

interface RGBA extends RGB {
    a: number;
}

interface HSL {
    h: number;
    s: number;
    l: number;
}

interface HSLA extends HSL {
    a: number;
}

interface HSV {
    h: number;
    s: number;
    v: number;
}

interface HSVA extends HSV {
    a: number;
}