import { ColorMapEditor } from "./ColorMapEditor";
import { TransparencyEditor } from "./TransparencyEditor";
import { AlphaStop, ColorMap, ColorStop, TransferFunction } from "./Types";
import objectAssignDeep from "object-assign-deep";

export class TransferFunctionEditor {
  private container: HTMLElement;

  private transparencyEditor: TransparencyEditor;

  private colorMapEditor: ColorMapEditor;

  private callbacks: Map<number, (transferFunctionEditor: TransferFunctionEditor) => void> = new Map();
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
    const finalOptions = objectAssignDeep(defaultOptions, options);

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

    this.colorMapEditor.addListener((colorMapEditor) => this.transparencyEditor.setColorMap(colorMapEditor.getColorMap()));

    this.transparencyEditor.setColorMap(this.colorMapEditor.getColorMap());

    this.transparencyEditor.addListener(() => {
      this.callbacks.forEach((value) => value(this));
    });
  }

  public addListener(callback: (transferFunctionEditor: TransferFunctionEditor) => void): number {
    const id = this.callbackCounter++;
    this.callbacks.set(id, callback);
    callback(this);
    return id;
  }

  public removeListener(id: number) {
    this.callbacks.delete(id);
  }

  public setAlphaStops(alphaStops: Array<AlphaStop>) {
    this.transparencyEditor.setAlphaStops(alphaStops);
  }

  public setColorMap(colorMap: Array<ColorStop>) {
    this.colorMapEditor.setColorStops(colorMap);
  }

  public getAlphaStops(): Array<AlphaStop> {
    return this.transparencyEditor.getAlphaStops();
  }

  public getColorMap(): ColorMap {
    return this.colorMapEditor.getColorMap();
  }

  public getTransferFunction(): TransferFunction {
    return this.transparencyEditor.getTransferFunction();
  }
}

export interface TransferFunctionEditorOptions {
  initialTransferFunction?: Array<AlphaStop>;
  initialColorMap?: ColorMap;
}