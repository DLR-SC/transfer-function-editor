import {ColorMap, ColorMapBin, ColorStop, InterpolationMethod} from './Types';
import {ColorPicker} from './ColorPicker';
import objectAssignDeep from 'object-assign-deep';
import {getColorFromColorMapAt, getColorMapBins} from './convert';
import * as d3Color from 'd3-color';
import {drawControlPoint} from './draw';
import Container from './Container';

/**
 * This creates a color map editor component, where the user can create a color gradient using stops and colors.
 *
 * @example
 *   const cm = new ColorMapEditor("#cm", {
 *     initialColorMap: {
 *       colorStops: [
 *         { stop: 0, color: "#0f0" },
 *         { stop: 0.5, color: "#f00" },
 *         { stop: 1, color: "#000" }
 *       ]
 *     }
 *   });
 *
 *   cm.addListener((colorMapEditor) => {
 *     console.log(colorMapEditor.getColorMap());
 *     // output:
 *     // {
 *     //   colorStops: [{stop: 0, color: "#0f0"},{stop: 0.5, color: "#f00"},{stop: 1, color: "#000"}],
 *     //   interpolationMethod: "HSL_LONG"
 *     // }
 *   });
 */
export class ColorMapEditor extends Container {
  /** This element lays out the canvas and all other controls. */
  private readonly rootElement: HTMLDivElement;

  /** The gradient and stops are painted in here. It also handles mouse input. */
  private readonly canvas: HTMLCanvasElement;

  /** The context for the canvas for convenience. */
  private ctx: CanvasRenderingContext2D;

  /** This is the color map that everything revolves around. The stops are always sorted. */
  private colorStops: Array<ColorStop>;

  /** The used method of interpolation between two color stops. */
  private interpolationMethod: InterpolationMethod;

  /** The size of the control points. Might become configurable in the future. */
  private controlPointSize: number;

  /** If the color map should have a discrete amount of values. */
  private discrete: boolean;

  /** The number of bins. */
  private bins: number;

  /** If true, the numbers under stops get displayed. */
  private showStopNumbers: boolean;

  /** The color picker for editing control point colors is embedded in this div. */
  private readonly colorPickerContainer: HTMLDivElement;

  /** If the interpolation method is set to editable, this element is the selection dropdown. */
  private interpolationMethodElement?: HTMLSelectElement;

  /** If the bins are set to editable, this element shows a checkbox to toggle the discretization. */
  private discreteElement?: HTMLInputElement;

  /** If the bins are set to editable, this element shows a number input field to configure the number of bins. */
  private binsElement?: HTMLInputElement;

  /** The color picker for editing control point colors. */
  private colorPicker: ColorPicker;

  /** This gets called when the color changes to notify users of this library. */
  private callbacks: Map<number, (colorMapEditor: ColorMapEditor) => void> = new Map();
  private callbackCounter = 0;

  /**
   * Creates a new color map editor inside the given container.
   *
   * @param container Either an HTMLElement or a query string to an element, in which the editor will be embedded.
   * @param options   Can be used to configure the color map editor. See {@link ColorMapEditorOptions}.
   */
  constructor(container: HTMLElement | string, options?: ColorMapEditorOptions) {
    super(container);

    // Set all defaults.
    const defaultOptions: ColorMapEditorOptions = {
      initialColorMap: {
        colorStops: [
          {stop: 0, color: 'green'},
          {stop: 0.5, color: 'yellow'},
          {stop: 1, color: 'red'},
        ],
        interpolationMethod: InterpolationMethod.HSL,
        discrete: false,
        bins: 7,
      },
      showStopNumbers: false,
      interpolationMethodsEditable: true,
      binSelectorEditable: true,
      controlPointSize: 7,
    };

    // Merge the options with the defaults.
    // !!! DON'T USE options AND defaultOptions AFTER THIS LINE !!!
    const finalOptions = objectAssignDeep(defaultOptions, options);

    this.colorStops = finalOptions.initialColorMap.colorStops;
    this.sortControlPoints();
    this.showStopNumbers = finalOptions.showStopNumbers;
    this.interpolationMethod = finalOptions.initialColorMap.interpolationMethod;
    this.discrete = finalOptions.initialColorMap.discrete;
    this.bins = finalOptions.initialColorMap.bins;
    this.controlPointSize = finalOptions.controlPointSize;

    this.parent.classList.add('tfe-color-map-editor');

    // This contains the canvas and the controls.
    this.rootElement = document.createElement('div');
    this.rootElement.classList.add('tfe-color-map-editor-root');
    this.rootElement.style.display = 'flex';
    this.rootElement.style.flexDirection = 'column';
    this.rootElement.style.gap = '5px';
    this.parent.appendChild(this.rootElement);

    // Prepare the canvas and the context.
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.parent.clientWidth;
    this.canvas.height = this.parent.clientHeight;

    this.rootElement.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', {alpha: false});

    // Prepare the container for the color picker and initialize it.
    this.colorPickerContainer = document.createElement('div');
    this.colorPickerContainer.classList.add('tfe-color-map-editor-color-picker-container');
    this.colorPickerContainer.style.width = 'fit-content';
    this.colorPickerContainer.style.padding = '12px';
    this.colorPickerContainer.style.backgroundColor = 'white';
    this.colorPickerContainer.style.border = '1px solid black';
    this.colorPickerContainer.style.visibility = 'hidden';
    this.colorPickerContainer.style.position = 'relative';
    this.parent.appendChild(this.colorPickerContainer);
    this.colorPicker = new ColorPicker(this.colorPickerContainer);

    this.setUpInputElements(finalOptions);

    this.draw();

    // Add all event listeners.
    this.addCanvasEventListeners();
  }

  /** Set new color stops. */
  public setColorStops(colorStops: Array<ColorStop>) {
    this.colorStops = colorStops;
    this.sortControlPoints();
    this.draw();
    this.sendUpdates();
  }

  /** Get the current color stops. */
  public getColorStops(): Array<ColorStop> {
    return this.colorStops;
  }

  /** Sets the interpolation method used for interpolating colors between two stops. */
  public setInterpolationMethods(interpolationMethod: InterpolationMethod) {
    this.interpolationMethod = interpolationMethod;

    if (this.interpolationMethodElement) {
      this.interpolationMethodElement.value = this.interpolationMethod;
    }

    this.draw();
    this.sendUpdates();
  }

  /** Get the interpolation method used for interpolating colors between two stops. */
  public getInterpolationMethods(): InterpolationMethod {
    return this.interpolationMethod;
  }

  /**
   * Sets, if the resulting color map is discrete or continuous. If discrete is true, the bins property controls how many
   * bins are shown.
   */
  public setDiscrete(discrete: boolean) {
    this.discrete = discrete;

    if (this.discreteElement) {
      this.binsElement.disabled = !this.discrete;
    }

    this.draw();
    this.sendUpdates();
  }

  /** If the color map is discrete. */
  public isDiscrete(): boolean {
    return this.discrete;
  }

  /** Sets the number of bins, if the color map is discrete. */
  public setBins(bins: number) {
    this.bins = Math.max(bins, 0);

    if (this.binsElement) {
      this.binsElement.valueAsNumber = this.bins;
    }

    this.draw();
    this.sendUpdates();
  }

  /** The number of bins, if the color map is discrete. */
  public getBins(): number {
    return this.bins;
  }

  /** Set a new color map. */
  public setColorMap(colorMap: ColorMap) {
    this.colorStops = colorMap.colorStops;
    this.sortControlPoints();
    this.discrete = colorMap.discrete;
    this.bins = Math.max(colorMap.bins || 0, 0);
    this.interpolationMethod = colorMap.interpolationMethod;

    if (this.discreteElement && this.binsElement) {
      this.discreteElement.checked = this.discrete;
      this.binsElement.valueAsNumber = this.bins;
      this.binsElement.disabled = !this.discrete;
    }

    if (this.interpolationMethodElement) {
      this.interpolationMethodElement.value = this.interpolationMethod;
    }

    this.draw();
    this.sendUpdates();
  }

  /** Get the current color map. */
  public getColorMap(): ColorMap {
    return {
      colorStops: this.colorStops,
      interpolationMethod: this.interpolationMethod,
      discrete: this.discrete || undefined,
      bins: this.discrete ? this.bins : undefined,
    };
  }

  /**
   * This function returns an array of bins with their color, if the color map is discrete. Otherwise, it will return an
   * empty array.
   */
  public getDiscreteColorMap(): Array<ColorMapBin> {
    return getColorMapBins(this.getColorMap());
  }

  /**
   * Register a callback that gets called, when the color map changes. The callback gets called once immediately.
   *
   * @param callback The function that gets called whenever the color map changes.
   */
  public addListener(callback: (colorMapEditor: ColorMapEditor) => void): number {
    const id = this.callbackCounter++;
    this.callbacks.set(id, callback);
    callback(this);
    return id;
  }

  /** Removes the listener with the given id. */
  public removeListener(id: number) {
    this.callbacks.delete(id);
  }

  /** This function notifies all listeners to this color map editor. */
  private sendUpdates() {
    this.callbacks.forEach((value) => value(this));
  }

  private sortControlPoints() {
    this.colorStops.sort((a, b) => a.stop - b.stop);
  }

  /** Draws the gradient and the control points. */
  private draw() {
    // Draw the gradient.
    for (let i = 0; i < this.canvas.width; ++i) {
      this.ctx.fillStyle = getColorFromColorMapAt(
        {
          colorStops: this.colorStops,
          interpolationMethod: this.interpolationMethod,
          discrete: this.discrete,
          bins: this.bins,
        },
        i / (this.canvas.width - 1)
      );

      this.ctx.fillRect(i, 0, 1, this.canvas.height);
    }

    // Draw the control points. To ensure visibility everywhere it is an alternating circle in white and black.
    for (let i = 0; i < this.colorStops.length; i++) {
      const x = this.colorStops[i].stop * this.canvas.width;
      const y = 0.5 * this.canvas.height;
      const color = this.colorStops[i].color;

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.controlPointSize, 0, 2 * Math.PI);
      this.ctx.fill();

      drawControlPoint(this.ctx, x, y, this.controlPointSize);

      // Below the control point we draw the number of the stop, if enabled.
      if (this.showStopNumbers) {
        if (i === 0) {
          this.ctx.textAlign = 'left';
        } else if (i === this.colorStops.length - 1) {
          this.ctx.textAlign = 'right';
        } else {
          this.ctx.textAlign = 'center';
        }

        const brightness = d3Color.hsl(color).l;
        this.ctx.fillStyle = brightness < 0.5 ? 'white' : 'black';
        this.ctx.fillText(this.colorStops[i].stop.toPrecision(3), x, this.canvas.height - 1);
      }
    }
  }

  /** Adds event listeners for adding, removing and moving control points as well as showing the color picker. */
  private addCanvasEventListeners() {
    // This flag prevents click events to trigger when dragging control points small distances.
    let draggedBefore: boolean = false;

    // Tracks if the user is currently dragging a control point.
    let isDragging: boolean = false;

    // The index of the currently dragged control point.
    let dragIndex: number = -1;

    // The AbortController is for removing the mousemove listener from the document, when the user stops dragging.
    let abortController: AbortController = null;

    /**
     * This function checks if a control point was selected, sets the dragIndex and isDragging fields and attaches a
     * mouse move listener to the document. This allows for more consistent control.
     */
    const checkDragStart = (e: {offsetX: number; offsetY: number}) => {
      // Figure out which control point was selected.
      dragIndex = -1;
      for (let i = 0; i < this.colorStops.length; i++) {
        const stop = this.colorStops[i];
        const dx = Math.abs(stop.stop * this.canvas.width - e.offsetX);
        if (dx < this.controlPointSize) {
          dragIndex = i;
          isDragging = true;
          break;
        }
      }

      if (isDragging) {
        // Attach a mouse move listener to the document.
        abortController = new AbortController();
        document.addEventListener(
          'mousemove',
          (e) => {
            e.preventDefault();

            if (dragIndex > 0 && dragIndex < this.colorStops.length - 1) {
              const offsetX = e.clientX - this.canvas.getBoundingClientRect().x;
              const leftBound = this.colorStops[dragIndex - 1].stop + Number.EPSILON;
              const rightBound = this.colorStops[dragIndex + 1].stop - Number.EPSILON;
              this.colorStops[dragIndex].stop = Math.max(leftBound, Math.min(rightBound, offsetX / this.canvas.width));
              this.draw();
              this.sendUpdates();
            }

            draggedBefore = true;
          },
          {signal: abortController.signal}
        );
      }
    };

    // This listener is responsible for:
    //  - Starting dragging a control point, if one was pressed on with the left mouse button.
    //  - Adding a control point if the left mouse button was pressed anywhere else (also starts dragging the newly
    //    created point).
    //  - Removing a control point on right click.
    this.canvas.addEventListener('mousedown', (e) => {
      draggedBefore = false;

      if (e.button === 0) {
        // Left Mouse Button
        // Check if a control point was selected with the left mouse button.
        checkDragStart(e);

        if (!isDragging) {
          // If no control point was selected a new one is being created and also immediately dragged.
          const x = Math.max(0, Math.min(1, e.offsetX / this.canvas.width));
          const color = getColorFromColorMapAt(
            {
              colorStops: this.colorStops,
              interpolationMethod: this.interpolationMethod,
              discrete: this.discrete,
              bins: this.bins,
            },
            x
          );
          const stop = {stop: x, color};
          this.colorStops.push(stop);
          this.sortControlPoints();
          this.draw();
          this.sendUpdates();
          checkDragStart(e);
        }
      } else if (e.button === 2) {
        // Right Mouse Button
        e.preventDefault();
        // If a control point was pressed on with the RMB it gets removed.
        for (let i = 1; i < this.colorStops.length - 1; i++) {
          const stop = this.colorStops[i];
          const dx = stop.stop * this.canvas.width - e.offsetX;
          const dy = 0.5 * this.canvas.height - e.offsetY;
          if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
            this.colorStops.splice(i, 1);
            this.draw();
            this.sendUpdates();
            return;
          }
        }
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });

    // This listener is responsible to stop the dragging action, once the mouse is lifted.
    document.addEventListener('mouseup', () => {
      if (isDragging && abortController) {
        abortController.abort();
        abortController = null;
        isDragging = false;
        dragIndex = -1;
      }
    });

    // This saves the id of the callback from the color picker.
    let colorPickerListener = -1;

    // When clicking a control point the color picker is shown.
    this.canvas.addEventListener('click', (e) => {
      if (draggedBefore) {
        return;
      }

      e.stopPropagation();
      let stop = null;
      for (let i = 0; i < this.colorStops.length; i++) {
        stop = this.colorStops[i];
        const dx = Math.abs(stop.stop * this.canvas.width - e.offsetX);
        if (dx < this.controlPointSize) {
          break;
        }
      }

      if (stop !== null) {
        // Figure out, where to position the color picker popup, depending on the available space.
        const pageY = this.canvas.height / 2 + this.canvas.getBoundingClientRect().y;
        const viewPortHeight = window.innerHeight;
        const cpHeight = this.colorPickerContainer.clientHeight;

        if (pageY + cpHeight < viewPortHeight) {
          // Show below the point
          const y = this.canvas.height / 2;
          this.colorPickerContainer.style.bottom = `${y}px`;
        } else if (pageY - cpHeight > 0) {
          // Show above the point
          const y = this.canvas.height / 2 + cpHeight;
          this.colorPickerContainer.style.bottom = `${y}px`;
        } else {
          // Show vertically centered on the point
          const y = this.canvas.height / 2 + cpHeight / 2;
          this.colorPickerContainer.style.bottom = `${y}px`;
        }

        const pageX = stop.stop * this.canvas.width + this.canvas.getBoundingClientRect().x;
        const viewPortWidth = window.innerWidth;
        const cpWidth = this.colorPickerContainer.clientWidth;

        if (pageX + cpWidth < viewPortWidth) {
          // Show right of the point
          const x = stop.stop * this.canvas.width;
          this.colorPickerContainer.style.left = `${x}px`;
        } else if (pageX - cpWidth > 0) {
          // Show left of the point
          const x = stop.stop * this.canvas.width - cpWidth;
          this.colorPickerContainer.style.left = `${x}px`;
        } else {
          // Show horizontally centered on the point
          const x = stop.stop * this.canvas.width - cpWidth / 2;
          this.colorPickerContainer.style.left = `${x}px`;
        }

        this.colorPickerContainer.style.visibility = 'visible';
        this.colorPicker.removeListener(colorPickerListener);
        this.colorPicker.setHEX(stop.color);
        colorPickerListener = this.colorPicker.addListener((colorPicker) => {
          stop.color = colorPicker.getHEX();
          this.draw();
          this.sendUpdates();
        });
      }
    });

    // Hides the color picker, if you click outside it.
    document.addEventListener('click', () => {
      this.colorPickerContainer.style.visibility = 'hidden';
    });

    // This prevents the color picker from closing when clicking inside it.
    this.colorPickerContainer.addEventListener('click', (e) => e.stopPropagation());

    // Ensures that the canvas gets redrawn when its size changes.
    const resizeObserver = new ResizeObserver(() => {
      this.canvas.width = this.parent.clientWidth;
      this.canvas.height = this.parent.clientHeight;
      this.draw();
    });
    resizeObserver.observe(this.parent);
  }

  /**
   * Depending on the users options this method creates a dropdown for selecting the interpolation method, a checkbox
   * for toggling if the color map is discrete and a number input for the number of bins.
   */
  private setUpInputElements(finalOptions) {
    // If no controls are enabled we don't add anything to the DOM.
    if (!finalOptions.interpolationMethodsEditable && !finalOptions.binSelectorEditable) {
      return;
    }

    // The root of the inputs. It aligns them horizontally and wraps them if needed.
    const settingsContainer = document.createElement('div');
    settingsContainer.classList.add('tfe-color-map-editor-settings');
    settingsContainer.style.display = 'flex';
    settingsContainer.style.flexDirection = 'row';
    settingsContainer.style.justifyContent = 'space-between';
    settingsContainer.style.alignItems = 'center';
    settingsContainer.style.flexWrap = 'wrap';
    this.rootElement.appendChild(settingsContainer);

    if (finalOptions.interpolationMethodsEditable) {
      const label = document.createElement('label');
      label.classList.add('tfe-color-map-editor-interpolation-method-label');
      label.innerText = 'Interpolation: ';

      this.interpolationMethodElement = document.createElement('select');
      this.interpolationMethodElement.classList.add('tfe-color-map-editor-interpolation-method-select');

      // Generate options for all interpolation methods.
      for (let method of Object.keys(InterpolationMethod)) {
        const option = document.createElement('option');
        option.classList.add('tfe-color-map-editor-interpolation-method-option');
        option.value = method;
        option.innerText = method.replace('_', ' ');
        this.interpolationMethodElement.options.add(option);
      }

      this.interpolationMethodElement.value = this.interpolationMethod;

      this.interpolationMethodElement.addEventListener('change', () => {
        this.interpolationMethod = InterpolationMethod[this.interpolationMethodElement.value];
        this.draw();
        this.sendUpdates();
      });

      label.appendChild(this.interpolationMethodElement);
      settingsContainer.appendChild(label);
    }

    if (finalOptions.binSelectorEditable) {
      const binSelectorRoot = document.createElement('div');
      binSelectorRoot.classList.add('tfe-color-map-editor-bin-selector');
      binSelectorRoot.style.display = 'flex';
      binSelectorRoot.style.flexDirection = 'row';
      binSelectorRoot.style.gap = '10px';
      binSelectorRoot.style.alignItems = 'center';
      settingsContainer.appendChild(binSelectorRoot);

      const checkboxLabel = document.createElement('label');
      checkboxLabel.classList.add('tfe-color-map-editor-bin-selector-checkbox-label');
      checkboxLabel.innerText = 'discrete: ';
      binSelectorRoot.appendChild(checkboxLabel);

      this.discreteElement = document.createElement('input');
      this.discreteElement.classList.add('tfe-color-map-editor-bin-selector-checkbox');
      this.discreteElement.type = 'checkbox';
      this.discreteElement.checked = this.discrete;
      checkboxLabel.appendChild(this.discreteElement);

      const binsLabel = document.createElement('label');
      binsLabel.classList.add('tfe-color-map-editor-bin-selector-number-label');
      binsLabel.innerText = 'bins: ';
      binSelectorRoot.appendChild(binsLabel);

      this.binsElement = document.createElement('input');
      this.binsElement.classList.add('tfe-color-map-editor-bin-selector-number-input');
      this.binsElement.style.width = '50px';
      this.binsElement.disabled = !this.discrete;
      this.binsElement.type = 'number';
      this.binsElement.min = '0';
      this.binsElement.step = '1';
      this.binsElement.valueAsNumber = this.bins;

      this.discreteElement.addEventListener('change', () => {
        this.discrete = this.discreteElement.checked;
        this.binsElement.disabled = !this.discrete;

        this.draw();
        this.sendUpdates();
      });

      this.binsElement.addEventListener('change', () => {
        this.bins = this.binsElement.valueAsNumber;

        this.draw();
        this.sendUpdates();
      });

      // Add scroll wheel support to the number input.
      this.binsElement.addEventListener('wheel', (ev: WheelEvent) => {
        ev.preventDefault();

        let value = this.binsElement.valueAsNumber;
        if (ev.deltaY > 0) {
          // Decrement
          value = Math.max(value - 1, 0);
        } else if (ev.deltaY < 0) {
          // Increment
          value = Math.max(value + 1, 0);
        }

        this.binsElement.valueAsNumber = Math.round(value);
        this.bins = this.binsElement.valueAsNumber;

        this.draw();
        this.sendUpdates();
      });

      // Ensure that all user inputs are properly handled. For example empty and negative input.
      const validateBins = (ev: Event) => {
        const el = ev.currentTarget as HTMLInputElement;
        if (!el.valueAsNumber || el.valueAsNumber < 0) {
          el.valueAsNumber = 0;
          this.bins = this.binsElement.valueAsNumber;
        }

        this.draw();
        this.sendUpdates();
      };

      this.binsElement.addEventListener('focusout', validateBins);
      this.binsElement.addEventListener('keypress', (ev: KeyboardEvent) => {
        if (ev.key === 'Enter') {
          validateBins(ev);
        }
      });

      binsLabel.appendChild(this.binsElement);
    }
  }
}

/**
 * The config options for the {@link ColorMapEditor} component.
 */
export interface ColorMapEditorOptions {
  initialColorMap?:
    | {
        /**
         * The initial color map.
         * Default:
         * [
         *   { stop: 0, color: "green" },
         *   { stop: 0.5, color: "yellow" },
         *   { stop: 1, color: "red" }
         * ]
         */
        colorStops?: Array<ColorStop>;

        /**
         * The method of interpolation.
         * Default: "HSL_LONG"
         */
        interpolationMethod?: InterpolationMethod;

        /**
         * If the color map is discrete or continuous.
         * Default: false
         */
        discrete?: boolean;

        /**
         * The number of bins in case the color map is continuous.
         * Default: 7
         */
        bins?: number;
      }
    | ColorMap;

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
}
