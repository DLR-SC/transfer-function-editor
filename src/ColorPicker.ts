import {hsl as d3HSL, rgb as d3RGB} from "d3-color";
import {hsv, hsv as d3HSV, HSVColor} from "d3-hsv";

export class ColorPicker {
    private container: HTMLElement;
    private showAlpha: boolean;
    private hsv: HSVColor;
    private backUpHue;
    private readonly svCanvas: HTMLCanvasElement;
    private svContext: CanvasRenderingContext2D;
    private readonly hCanvas: HTMLCanvasElement;
    private hContext: CanvasRenderingContext2D;
    private readonly CANVAS_SIZE: number = 256;

    private callback: (newColor: Color) => void;

    private inputFields: {
        h: HTMLInputElement,
        s: HTMLInputElement,
        v: HTMLInputElement,
        r: HTMLInputElement,
        g: HTMLInputElement,
        b: HTMLInputElement,
        hex: HTMLInputElement
    };

    private previewElement: HTMLDivElement;

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
        if (Number.isNaN(this.hsv.h)) {
            this.hsv.h = 180;
        } else {
            this.backUpHue = this.hsv.h;
        }

        this.showAlpha = showAlpha;
        this.container.classList.add("tfe-color-picker");

        this.container.innerHTML = `
            <style>
                .tfe-color-picker-root {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    margin: 12px;
                }
                
                .tfe-color-picker-sl-picker {
                    width: ${this.CANVAS_SIZE}px;
                    height: ${this.CANVAS_SIZE}px;
                }
                
                .tfe-color-picker-h-picker {
                    width: 18px;
                    height: ${this.CANVAS_SIZE}px;
                    margin-left: 12px;
                }
            
                .tfe-color-picker-input-root {
                    display: grid;
                    grid-template-columns: 36px 78px;
                    grid-template-rows: repeat(3, auto) 20px repeat(3, auto) 20px auto;
                    grid-column-gap: 6px;
                    grid-row-gap: 6px;
                    align-items: center;
                    align-content: space-evenly;
                    margin-left: 12px;
                }
                
                .tfe-color-preview {
                    grid-column: 1 / span 2;
                    height: 50px;
                    background: ${this.getHEX()};
                }
            
                .tfe-color-picker-input-root > label {
                    text-align: right;
                } 
                
                .tfe-color-picker-input-root > input {
                    text-align: right;
                    font-family: monospace;
                } 
            </style>
            <div class="tfe-color-picker-root">
                <div class="tfe-color-picker-sl-picker">
                    <canvas class="tfe-color-picker-sl-picker-canvas" width="${this.CANVAS_SIZE}" height="${this.CANVAS_SIZE}" />
                </div>
                <div class="tfe-color-picker-h-picker">
                    <canvas class="tfe-color-picker-h-picker-canvas" width="18" height="${this.CANVAS_SIZE}" />            
                </div>
                <form class="tfe-color-picker-input-root">
                    <div class="tfe-color-preview"></div>
                    
                    <div></div><div></div>    
                    
                    <label for="h">h:</label>
                    <input class="tfe-color-picker-h-input" name="h" type="number" min="0" max="360" step="1" value="${this.hsv.h.toFixed(0)}">
    
                    <label for="s">s:</label>
                    <input class="tfe-color-picker-s-input" name="s" type="number" min="0" max="100" step="1" value="${(this.hsv.s * 100).toFixed(0)}">
    
                    <label for="v">v:</label>
                    <input class="tfe-color-picker-v-input" name="v" type="number" min="0" max="100" step="1" value="${(this.hsv.v * 100).toFixed(0)}">
    
                    <div></div><div></div>    
    
                    <label for="r">r:</label>
                    <input class="tfe-color-picker-r-input" name="r" type="number" min="0" max="255" step="1" value="${this.hsv.rgb().r.toFixed(0)}">
    
                    <label for="g">g:</label>
                    <input class="tfe-color-picker-g-input" name="g" type="number" min="0" max="255" step="1" value="${this.hsv.rgb().g.toFixed(0)}">
    
                    <label for="b">b:</label>
                    <input class="tfe-color-picker-b-input" name="b" type="number" min="0" max="255" step="1" value="${this.hsv.rgb().b.toFixed(0)}">
                    
                    <div></div><div></div>    
                    
                    <label for="hex">hex:</label>
                    <input class="tfe-color-picker-hex-input" name="hex" type="text" minlength="4" maxlength="9" value="${this.getHEX()}">
                </form>
            </div>        
        `

        this.svCanvas = this.container.querySelector<HTMLCanvasElement>(".tfe-color-picker-sl-picker-canvas");
        this.svContext = this.svCanvas.getContext("2d", {alpha: false});

        this.drawSVPicker();
        this.addSVEventListener();

        this.hCanvas = this.container.querySelector<HTMLCanvasElement>(".tfe-color-picker-h-picker-canvas");
        this.hContext = this.hCanvas.getContext("2d", {alpha: false});

        this.drawHPicker();
        this.addHEventListener();
        this.inputFields = {
            h: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-h-input"),
            s: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-s-input"),
            v: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-v-input"),
            r: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-r-input"),
            g: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-g-input"),
            b: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-b-input"),
            hex: this.container.querySelector<HTMLInputElement>(".tfe-color-picker-hex-input"),
        }
        this.addInputEventListeners();

        this.previewElement = this.container.querySelector<HTMLDivElement>(".tfe-color-preview");
    }

    public onChange(callback: (newColor: Color) => void) {
        this.callback = callback;
    }

    private sendUpdate() {
        const hex = this.getHEX();
        this.previewElement.style.backgroundColor = hex;

        if (this.callback) {
            const rgb = this.getRGBA();
            const hsl = this.getHSLA();
            const hsv = this.getHSVA();
            this.callback({...rgb, ...hsl, ...hsv, hex});
        }
    }

    public setHEX(color: string) {
        this.hsv = d3HSV(color);
        this.sendUpdate();
        this.validateHue();
        this.drawAll();
    }

    public setRGB(r: number, g: number, b: number) {
        this.hsv = d3HSV(`rgb(${r * 255},${g * 255},${b * 255})`);
        this.sendUpdate();
        this.validateHue();
        this.drawAll();
    }

    public setRGBA(r: number, g: number, b: number, a: number) {
        this.hsv = d3HSV(`rgba(${r * 255},${g * 255},${b * 255},${1 - a})`);
        this.sendUpdate();
        this.validateHue();
        this.drawAll();
    }

    public setHSL(h: number, s: number, l: number) {
        this.hsv = d3HSV(`hsl(${h * 360} ${s * 100} ${l * 100})`);
        this.sendUpdate();
        this.validateHue();
        this.drawAll();
    }

    public setHSLA(h: number, s: number, l: number, a: number) {
        this.hsv = d3HSV(`hsla(${h * 360} ${s * 100} ${l * 100} ${1 - a})`);
        this.sendUpdate();
        this.validateHue();
        this.drawAll();
    }

    public setHSV(h: number, s: number, v: number) {
        this.hsv = d3HSV(h, s, v);
        this.sendUpdate();
        this.validateHue();
        this.drawAll();
    }

    public setHSVA(h: number, s: number, v: number, a: number) {
        this.hsv = d3HSV(h, s, v, 1 - a);
        this.sendUpdate();
        this.validateHue();
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

        this.svContext.strokeStyle = "black";
        this.svContext.fillStyle = "transparent";
        const x = this.hsv.s * this.CANVAS_SIZE;
        const y = (1 - this.hsv.v) * this.CANVAS_SIZE;
        this.svContext.beginPath();
        this.svContext.arc(x, y, 5, 0, 2 * Math.PI);
        this.svContext.fill();
        this.svContext.stroke();
    }

    private drawHPicker() {
        const gradient = this.hContext.createLinearGradient(0, 0, 0, this.hCanvas.height);
        gradient.addColorStop(0 / 6, "#ff0000");
        gradient.addColorStop(1 / 6, "#ffff00");
        gradient.addColorStop(2 / 6, "#00ff00");
        gradient.addColorStop(3 / 6, "#00ffff");
        gradient.addColorStop(4 / 6, "#0000ff");
        gradient.addColorStop(5 / 6, "#ff00ff");
        gradient.addColorStop(6 / 6, "#ff0000");
        this.hContext.fillStyle = gradient;
        this.hContext.fillRect(0, 0, this.hCanvas.width, this.hCanvas.height);

        this.hContext.strokeStyle = "black";
        this.hContext.fillStyle = "transparent";
        const x = this.hCanvas.width / 2;
        const y = (this.hsv.h / 360) * this.hCanvas.height;
        this.hContext.beginPath();
        this.hContext.arc(x, y, 5, 0, 2 * Math.PI);
        this.hContext.fill();
        this.hContext.stroke();
    }

    private addSVEventListener() {
        let isDragging = false;

        const updateSV = (x, y) => {
            this.hsv.s = clamp(x / this.CANVAS_SIZE, 0, 1);
            this.hsv.v = clamp(1 - y / this.CANVAS_SIZE, 0, 1);
            this.sendUpdate();
            this.drawSVPicker();
            this.updateHSVInputFields();
            this.updateRGBInputFields();
            this.updateHEXInputField();
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

        this.svCanvas.addEventListener("mouseleave", (e) => {
            if (isDragging) {
                updateSV(e.offsetX, e.offsetY);
            }

            isDragging = false;
        });

        this.svCanvas.addEventListener("mouseup", (e) => isDragging = false);
    }

    private addHEventListener() {
        let isDragging = false;

        const updateH = (y) => {
            this.hsv.h = clamp(Math.round((y / this.CANVAS_SIZE) * 360), 0, 360);
            this.backUpHue = this.hsv.h;
            this.sendUpdate();
            this.drawAll();
            this.inputFields.h.valueAsNumber = Math.round(this.hsv.h);
            this.updateRGBInputFields();
            this.updateHEXInputField();
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

        this.hCanvas.addEventListener("mouseleave", (e) => {
            if (isDragging) {
                updateH(e.offsetY);
            }

            isDragging = false;
        });

        this.hCanvas.addEventListener("mouseup", (e) => isDragging = false);
    }

    private addInputEventListeners() {
        this.inputFields.h.addEventListener("input", (ev: InputEvent) => {
            const value = (ev.currentTarget as HTMLInputElement).valueAsNumber;
            if (0 <= value && value <= 360) {
                this.hsv.h = value;
                this.backUpHue = this.hsv.h;
                this.sendUpdate();
                this.drawAll();
                this.updateRGBInputFields();
                this.updateHEXInputField();
            }
        });

        this.inputFields.s.addEventListener("input", (ev: InputEvent) => {
            const value = (ev.currentTarget as HTMLInputElement).valueAsNumber;
            if (0 <= value && value <= 100) {
                this.hsv.s = value / 100;
                this.sendUpdate();
                this.drawSVPicker();
                this.updateRGBInputFields();
                this.updateHEXInputField();
            }
        });

        this.inputFields.v.addEventListener("input", (ev: InputEvent) => {
            const value = (ev.currentTarget as HTMLInputElement).valueAsNumber;
            if (0 <= value && value <= 100) {
                this.hsv.v = value / 100;
                this.sendUpdate();
                this.drawSVPicker();
                this.updateRGBInputFields();
                this.updateHEXInputField();
            }
        });

        this.inputFields.r.addEventListener("input", (ev: InputEvent) => {
            const value = (ev.currentTarget as HTMLInputElement).valueAsNumber;
            if (0 <= value && value < 256) {
                const oldRGB = this.hsv.rgb();
                this.hsv = d3HSV(`rgba(${Math.round(value)},${Math.round(oldRGB.g)},${Math.round(oldRGB.b)},${oldRGB.opacity})`);
                this.validateHue();
                this.sendUpdate();
                this.drawAll();
                this.updateHSVInputFields();
                this.updateHEXInputField();
            }
        });

        this.inputFields.g.addEventListener("input", (ev: InputEvent) => {
            const value = (ev.currentTarget as HTMLInputElement).valueAsNumber;
            if (0 <= value && value < 256) {
                const oldRGB = this.hsv.rgb();
                this.hsv = d3HSV(`rgba(${Math.round(oldRGB.r)},${Math.round(value)},${Math.round(oldRGB.b)},${oldRGB.opacity})`);
                this.validateHue();
                this.sendUpdate();
                this.drawAll();
                this.updateHSVInputFields();
                this.updateHEXInputField();
            }
        });

        this.inputFields.b.addEventListener("input", (ev: InputEvent) => {
            const value = (ev.currentTarget as HTMLInputElement).valueAsNumber;
            if (0 <= value && value < 256) {
                const oldRGB = this.hsv.rgb();
                this.hsv = d3HSV(`rgba(${Math.round(oldRGB.r)},${Math.round(oldRGB.g)},${Math.round(value)},${oldRGB.opacity})`);
                this.validateHue();
                this.sendUpdate();
                this.drawAll();
                this.updateHSVInputFields();
                this.updateHEXInputField();
            }
        });

        this.inputFields.hex.addEventListener("input", (ev: InputEvent) => {
            const value = (ev.currentTarget as HTMLInputElement).value;
            if (value.match(/#(?:[0-9a-fA-F]{3,4}){1,2}/)) {
                this.hsv = d3HSV(value);
                this.validateHue();
                this.sendUpdate();
                this.drawAll();
                this.updateRGBInputFields();
                this.updateHSVInputFields();
            }
        });
    }

    private updateHSVInputFields() {
        this.inputFields.h.valueAsNumber = clamp(Math.round(this.hsv.h), 0, 360);
        this.inputFields.s.valueAsNumber = clamp(Math.round(this.hsv.s * 100), 0, 100);
        this.inputFields.v.valueAsNumber = clamp(Math.round(this.hsv.v * 100), 0, 100);
    }

    private updateRGBInputFields() {
        const rgb = this.hsv.rgb();
        this.inputFields.r.valueAsNumber = clamp(Math.round(rgb.r), 0, 255);
        this.inputFields.g.valueAsNumber = clamp(Math.round(rgb.g), 0, 255);
        this.inputFields.b.valueAsNumber = clamp(Math.round(rgb.b), 0, 255);
    }

    private updateHEXInputField() {
        this.inputFields.hex.value = this.getHEX();
    }

    private validateHue() {
        if (Number.isNaN(this.hsv.h)) {
            this.hsv.h = this.backUpHue;
        } else {
            this.backUpHue = this.hsv.h;
        }
    }

    private formatHSVA(hsv: HSVColor): string {
        return d3HSL(hsv.toString()).formatHex8();
    }

}

function clamp(number, min, max): number {
    return Math.max(min, Math.min(max, number));
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

type Color = RGBA & HSLA & HSVA & {hex: string};