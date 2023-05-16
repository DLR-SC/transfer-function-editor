import {ColorMapEditor} from './ColorMapEditor';
import {TransparencyEditor} from './TransparencyEditor';
import {AlphaStop, ColorMap, ColorMapBin, ColorStop, TransferFunction} from './Types';
import objectAssignDeep from 'object-assign-deep';

/**
 * This component creates a complete transfer function editor, combining the features from the transparency and color
 * map editors.
 *
 * @example
 *   const tf = new TransferFunctionEditor("#tf-editor", {
 *     initialColorMap: {
 *       colorStops: [
 *         {stop: 0, color: "blue"},
 *         {stop: 0.5, color: "white"},
 *         {stop: 1, color: "red"}
 *       ]
 *     }
 *   });
 *
 *
 *   tf.addListener((transferFunctionEditor) => {
 *     console.log(transferFunctionEditor.getTransferFunction());
 *     // output:
 *     // {
 *     //   alphaStops: [
 *     //     { stop: 0, alpha: 0 },
 *     //     { stop: 0.5, alpha: 0.5 },
 *     //     { stop: 1, alpha: 1 }
 *     //   ],
 *     //   colorMap: {
 *     //     colorStops: [
 *     //       { stop: 0, color: "blue" },
 *     //       { stop: 0.5, color": "white" },
 *     //       { stop: 1, color: "red" }
 *     //     ],
 *     //     interpolationMethod: "HSL_LONG"
 *     //   }
 *     // }
 *   }
 */
export class TransferFunctionEditor {
  /** The element, in which the transfer function editor gets embedded. */
  private container: HTMLElement;

  /** The editor component for changing the transparencies. */
  private transparencyEditor: TransparencyEditor;

  /** The editor component for changing the colors. */
  private colorMapEditor: ColorMapEditor;

  /** This gets called, when the transfer function changes to notify users of this library. */
  private callbacks: Map<number, (transferFunctionEditor: TransferFunctionEditor) => void> = new Map();
  private callbackCounter = 0;

  /**
   * Creates a new transfer function editor inside the given container.
   *
   * @param container Either an HTMLElement or a query string to an element, in which the editor will be embedded.
   * @param options   Can be used to configure the transfer function editor. See {@link TransferFunctionEditorOptions}.
   */
  constructor(container: HTMLElement | string, options?: TransferFunctionEditorOptions) {
    if (container) {
      if (typeof container === 'string') {
        this.container = document.querySelector(container);
      } else {
        this.container = container;
      }
    } else {
      throw 'No element given!';
    }

    // Set all defaults.
    const defaultOptions: TransferFunctionEditorOptions = {};

    // Merge the options with the defaults.
    // !!! DON'T USE options AND defaultOptions AFTER THIS LINE !!!
    const finalOptions = objectAssignDeep(defaultOptions, options);

    this.container.classList.add('tfe-transfer-function-editor');

    const transparencyEditorElement = document.createElement('div');
    transparencyEditorElement.style.width = '100%';
    transparencyEditorElement.style.minHeight = '50px';
    this.container.append(transparencyEditorElement);
    this.transparencyEditor = new TransparencyEditor(transparencyEditorElement, finalOptions);

    const colorMapEditorElement = document.createElement('div');
    colorMapEditorElement.style.width = '100%';
    colorMapEditorElement.style.minHeight = '10px';
    this.container.append(colorMapEditorElement);
    this.colorMapEditor = new ColorMapEditor(colorMapEditorElement, finalOptions);

    // Connect the color map editor to the transparency editor.
    this.colorMapEditor.addListener((colorMapEditor) =>
      this.transparencyEditor.setColorMap(colorMapEditor.getColorMap())
    );

    this.transparencyEditor.setColorMap(this.colorMapEditor.getColorMap());

    // When something in the transparency editor changes we notify our listeners. This also includes changes to the
    // color map. The control flow goes like this:
    // ColorMapEditor --notify--> TransparencyEditor --notify--> TransferFunctionEditor --notify--> Listeners
    this.transparencyEditor.addListener(() => {
      this.callbacks.forEach((value) => value(this));
    });
  }

  /**
   * Register a callback that gets called, when the transfer function changes. The callback gets called once
   * immediately.
   *
   * @param callback The function that gets called whenever the transfer function changes.
   */
  public addListener(callback: (transferFunctionEditor: TransferFunctionEditor) => void): number {
    const id = this.callbackCounter++;
    this.callbacks.set(id, callback);
    callback(this);
    return id;
  }

  /** Removes the listener with the given id. */
  public removeListener(id: number) {
    this.callbacks.delete(id);
  }

  /** Get the alpha stops. */
  public getAlphaStops(): Array<AlphaStop> {
    return this.transparencyEditor.getAlphaStops();
  }

  /** Replace the existing alpha stops with new ones. */
  public setAlphaStops(alphaStops: Array<AlphaStop>) {
    this.transparencyEditor.setAlphaStops(alphaStops);
  }

  /** Get the current color map. */
  public getColorMap(): ColorMap {
    return this.colorMapEditor.getColorMap();
  }

  /**
   * This function returns an array of bins with their color, if the color map is discrete. Otherwise, it will return an
   * empty array.
   */
  public getDiscreteColorMap(): Array<ColorMapBin> {
    return this.colorMapEditor.getDiscreteColorMap();
  }

  /** Set a new color map. */
  public setColorMap(colorMap: Array<ColorStop>) {
    this.colorMapEditor.setColorStops(colorMap);
  }

  /** Returns the complete transfer function including the alpha values and the color map. */
  public getTransferFunction(): TransferFunction {
    return this.transparencyEditor.getTransferFunction();
  }
}

/**
 * The config options for the {@link TransferFunctionEditor} component.
 */
export interface TransferFunctionEditorOptions {
  /**
   * The initial list of alpha stops.
   * Default:
   * [
   *   { stop: 0, alpha: 0 },
   *   { stop: 0.5, alpha: 0.5 },
   *   { stop: 1, alpha: 1 }
   * ]
   */
  initialAlphaStops?: Array<AlphaStop>;

  /**
   * The initial color map.
   * Default:
   * {
   *   colorStops: [
   *     { stop: 0, color: "green" },
   *     { stop: 0.5, color: "yellow" },
   *     { stop: 1, color: "red" }
   *   ],
   *   interpolationMethod: InterpolationMethod.HSL_LONG,
   *   discrete: false,
   *   bins: 7
   * }
   */
  initialColorMap?: ColorMap;

  /**
   * If the value of a stop is rendered below the control point.
   * Default: false
   */
  showStopNumbers?: boolean;

  /**
   * If a dropdown with different interpolation methods is shown.
   * Default: true
   */
  interpolationMethodsEditable?: boolean;

  /**
   * If settings for a discrete color map are shown.
   * Default: true
   */
  binSelectorEditable?: boolean;

  /**
   * The size of control points in pixel.
   * Default: 7
   */
  controlPointSize?: number;

  /**
   * If the transparency should be visualized using the classic grid.
   * Default: true
   */
  showAlphaGrid?: boolean;

  /**
   * The size in pixel of the grid cells.
   * Default: 8
   */
  alphaGridSize?: number;
}
