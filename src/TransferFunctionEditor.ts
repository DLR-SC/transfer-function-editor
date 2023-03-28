import { ColorMapEditor } from "./ColorMapEditor";
import { TransparencyEditor } from "./TransparencyEditor";
import { AlphaStop, ColorStop, TransferFunction } from "./Types";

export class TransferFunctionEditor {
  private container: HTMLElement;

  private transparencyEditor: TransparencyEditor;

  private colorMapEditor: ColorMapEditor;

  private callbacks: Map<number, (transferFunction: TransferFunction) => void> = new Map();
  private callbackCounter = 0;

  constructor(container: HTMLElement | string, options?: TransferFunctionEditorOptions) {
    if (container) {
      if (typeof container === "string") {
        this.container = document.querySelector(container);
      } else {
        this.container = container;
      }
    } else {
      throw "No element given!";
    }

    const defaultOptions: TransferFunctionEditorOptions = {};
    const finalOptions = Object.assign(defaultOptions, options);

    this.container.classList.add("tfe-transfer-function-editor");

    const transparencyEditorElement = document.createElement("div");
    transparencyEditorElement.style.width = "100%";
    transparencyEditorElement.style.minHeight = "50px";
    this.container.append(transparencyEditorElement);
    this.transparencyEditor = new TransparencyEditor(transparencyEditorElement, finalOptions);

    const colorMapEditorElement = document.createElement("div");
    colorMapEditorElement.style.width = "100%";
    colorMapEditorElement.style.minHeight = "10px";
    this.container.append(colorMapEditorElement);
    this.colorMapEditor = new ColorMapEditor(colorMapEditorElement, finalOptions);

    this.colorMapEditor.addListener((colorMap) => this.transparencyEditor.setColorMap(colorMap));

    this.transparencyEditor.setColorMap(this.colorMapEditor.getColorMap());

    this.transparencyEditor.addListener((tf) => {
      this.callbacks.forEach((value) => value(tf));
    });
  }

  public addListener(callback: (transferFunction: TransferFunction) => void): number {
    const id = this.callbackCounter++;
    this.callbacks.set(id, callback);
    callback(this.transparencyEditor.getTransferFunction());
    return id;
  }

  public removeListener(id: number) {
    this.callbacks.delete(id);
  }

  public setAlphaStops(alphaStops: Array<AlphaStop>) {
    this.transparencyEditor.setAlphaStops(alphaStops);
  }

  public setColorMap(colorMap: Array<ColorStop>) {
    this.colorMapEditor.setColorMap(colorMap);
  }

  public getAlphaStops(): Array<AlphaStop> {
    return this.transparencyEditor.getAlphaStops();
  }

  public getColorMap(): Array<ColorStop> {
    return this.colorMapEditor.getColorMap();
  }
}

export interface TransferFunctionEditorOptions {
  initialTransferFunction?: Array<AlphaStop>;
  initialColorMap?: Array<ColorStop>;
}