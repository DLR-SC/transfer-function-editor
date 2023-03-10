import {hsl as d3HSL, rgb as d3RGB} from "d3-color";
import {hsv as d3HSV} from "d3-hsv";

export class ColorPicker {
    private container: HTMLElement;
    private showAlpha: boolean;
    private hex: string;
    private hue: number;
    private readonly slCanvas: HTMLCanvasElement;
    private slCtx: CanvasRenderingContext2D;
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

        this.showAlpha = showAlpha;
        this.hex = initialColor;
        this.hue = this.getHSL().h;
        this.container.classList.add("tfe-color-picker");

        const rootContainer = document.createElement("div");
        rootContainer.classList.add("tfe-color-picker-root");
        rootContainer.style.width = "100%";
        rootContainer.style.height = "100%";
        rootContainer.style.display = "flex";
        rootContainer.style.padding = "12px";
        this.container.append(rootContainer);

        const slPickerContainer = document.createElement("div");
        slPickerContainer.classList.add("tfe-color-picker-sl-picker");
        slPickerContainer.style.width = `${this.CANVAS_SIZE}px`;
        slPickerContainer.style.height = `${this.CANVAS_SIZE}px`;
        rootContainer.append(slPickerContainer);

        this.slCanvas = document.createElement("canvas");
        this.slCanvas.width = slPickerContainer.clientWidth;
        this.slCanvas.height = slPickerContainer.clientHeight;

        slPickerContainer.appendChild(this.slCanvas);
        this.slCtx = this.slCanvas.getContext("2d", {alpha: false});

        this.drawSL();
    }

    public setHEX(color: string) {
        this.hex = color;
    }

    public setRGB(r: number, g: number, b: number) {
        this.hex = d3RGB(r, g, b).formatHex();
    }

    public setRGBA(r: number, g: number, b: number, a: number) {
        this.hex = d3RGB(r, g, b, 1 - a).formatHex8();
    }

    public setHSL(h: number, s: number, l: number) {
        this.hex = d3HSL(h, s, l).formatHex();
    }

    public setHSLA(h: number, s: number, l: number, a: number) {
        this.hex = d3HSL(h, s, l, 1 - a).formatHex8();
    }

    public getHEX(): string {
        return this.hex;
    }

    public getRGB(): RGB {
        const rgb = d3RGB(this.hex);
        return {r: rgb.r, g: rgb.g, b: rgb.b};
    }

    public getRGBA(): RGBA {
        const rgb = d3RGB(this.hex);
        return {r: rgb.r, g: rgb.g, b: rgb.b, a: 1 - rgb.opacity};
    }

    public getHSL(): HSL {
        const hsl = d3HSL(this.hex);
        return {h: hsl.h, s: hsl.s, l: hsl.l};
    }

    public getHSLA(): HSLA {
        const hsl = d3HSL(this.hex);
        return {h: hsl.h, s: hsl.s, l: hsl.l, a: 1 - hsl.opacity};
    }

    private drawSL() {
        console.time("draw");
        for (let x = 0; x < this.CANVAS_SIZE; x++) {
            for (let y = 0; y < this.CANVAS_SIZE; y++) {
                this.slCtx.fillStyle = d3HSV(this.hue, x / this.CANVAS_SIZE, 1 - (y / this.CANVAS_SIZE)).formatHex();
                this.slCtx.fillRect(x, y, 1, 1);
            }
        }
        console.timeEnd("draw");
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