import {ColorMapEditor} from "./ColorMapEditor";
import {TransparencyEditor} from "./TransparencyEditor";
import {AlphaStop, ColorStop} from "./Types";

export class TransferFunctionEditor {
    private container: HTMLElement;

    private transparencyEditor: TransparencyEditor;

    private colorMapEditor: ColorMapEditor;

    constructor(container: HTMLElement | string) {
        if (container) {
            if (typeof (container) === "string") {
                this.container = document.querySelector(container);
            } else {
                this.container = container;
            }
        } else {
            throw "No element given!"
        }

        this.container.classList.add("tfe-transfer-function-editor");

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

        this.transparencyEditor.setColorMap(this.colorMapEditor.getColorMap());
    }

    public setAlphaStops(alphaStops: Array<AlphaStop>) {
        this.transparencyEditor.setAlphaStops(alphaStops);
    }

    public setColorMap(colorMap: Array<ColorStop>) {
        this.colorMapEditor.setColorMap(colorMap);
    }
}


