import {ColorMapEditor} from './ColorMapEditor';
import {TransparencyEditor} from './TransparencyEditor';
import {AlphaStop, ColorStop, TransferFunction} from './Types';

export class TransferFunctionEditor {
  private container: HTMLElement;

  private transparencyEditor: TransparencyEditor;

  private colorMapEditor: ColorMapEditor;

  private callback: (transferFunction: TransferFunction) => void = null;

  constructor(container: HTMLElement | string) {
    if (container) {
      if (typeof container === 'string') {
        this.container = document.querySelector(container);
      } else {
        this.container = container;
      }
    } else {
      throw 'No element given!';
    }

    this.container.classList.add('tfe-transfer-function-editor');

    const transparencyEditorElement = document.createElement('div');
    transparencyEditorElement.style.width = '100%';
    transparencyEditorElement.style.minHeight = '50px';
    this.container.append(transparencyEditorElement);
    this.transparencyEditor = new TransparencyEditor(transparencyEditorElement);

    const colorMapEditorElement = document.createElement('div');
    colorMapEditorElement.style.width = '100%';
    colorMapEditorElement.style.minHeight = '10px';
    this.container.append(colorMapEditorElement);
    this.colorMapEditor = new ColorMapEditor(colorMapEditorElement);

    this.colorMapEditor.onUpdate((colorMap) => this.transparencyEditor.setColorMap(colorMap));

    this.transparencyEditor.setColorMap(this.colorMapEditor.getColorMap());

    this.transparencyEditor.onUpdate((tf) => {
      if (this.callback) {
        this.callback(tf);
      }
    });
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
