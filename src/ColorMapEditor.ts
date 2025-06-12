import {html, LitElement, PropertyValues} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import {when} from 'lit/directives/when.js';
import {InterpolationMethod} from './CommonTypes';
import {drawControlPoint} from './internal/draw';
import * as d3Color from 'd3-color';
import {ColorPicker} from './ColorPicker';
import {ColorMapMixin} from './internal/mixins/ColorMapMixin';

@customElement('tfe-color-map-editor')
export class ColorMapEditor extends ColorMapMixin(LitElement) {
  @property({type: Number, attribute: 'control-point-size'})
  controlPointSize: number = 7;

  @property({type: String})
  width: string = '100%';

  @property({type: String})
  height: string = '40px';

  protected render() {
    return html`
      <div class="tfe-color-map-editor-root" style="display: flex; flex-direction: column; gap: 5px">
        <canvas
          class="tfe-color-map-editor-canvas"
          style="width: ${this.width}; height: ${this.height}; border: 1px solid black"
          @mousedown=${this.onMouseDown}
          @click=${this.onClick}
          @contextmenu=${(ev: MouseEvent) => {
            ev.preventDefault();
            ev.stopPropagation();
            return false;
          }}
        ></canvas>
        ${when(
          this.interpolationMethodsEditable || this.binSelectorEditable,
          () => html`
            <div
              class="tfe-color-map-editor-controls"
              style="display: flex; flex-direction: row; justify-content: space-between"
            >
              ${when(
                this.interpolationMethodsEditable,
                () => html`
                  <label class="tfe-color-map-editor-interpolation-method-label">
                    Interpolation:
                    <select
                      class="tfe-color-map-editor-interpolation-method-select"
                      @change=${(ev: Event) => {
                        ev.stopPropagation();
                        // @ts-ignore
                        this.interpolationMethod = InterpolationMethod[ev.target.value];
                      }}
                    >
                      ${Object.keys(InterpolationMethod).map((method) => {
                        return html`
                          <option
                            class="tfe-color-map-editor-interpolation-method-option"
                            .value=${method}
                            ?selected=${method === this.interpolationMethod}
                          >
                            ${method.replace('_', ' ')}
                          </option>
                        `;
                      })}
                    </select>
                  </label>
                `
              )}
              ${when(
                this.binSelectorEditable,
                () => html`
                  <div
                    class="tfe-color-map-editor-bin-selector"
                    style="display: flex; flex-direction: row; gap: 10px; align-items: center"
                  >
                    <label class="tfe-color-map-editor-bin-selector-checkbox-label">
                      discrete:
                      <input
                        class="tfe-color-map-editor-bin-selector-checkbox"
                        type="checkbox"
                        ?checked=${this.discrete}
                        @change=${(ev: Event) => {
                          ev.stopPropagation();
                          return (this.discrete = (ev.target as HTMLInputElement).checked);
                        }}
                      />
                    </label>
                    <label class="tfe-color-map-editor-bin-selector-number-label">
                      bins:
                      <tfe-number-input
                        class="tfe-color-map-editor-bin-selector-number-input"
                        .min=${0}
                        .max=${999}
                        .value=${this.bins}
                        ?disabled=${!this.discrete}
                        @change=${(ev: CustomEvent<number>) => {
                          ev.stopPropagation();
                          return (this.bins = ev.detail);
                        }}
                      >
                      </tfe-number-input>
                    </label>
                  </div>
                `
              )}
            </div>
          `
        )}
      </div>
      <dialog
        class="tfe-color-map-editor-picker-container"
        @mousedown=${(ev: MouseEvent) => ev.stopPropagation()}
        style="
          position: fixed;
          width: fit-content;
          padding: 12px;
          margin: 0;
          border: 1px solid black;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2)
        "
      >
        <tfe-color-picker @change=${(ev: Event) => ev.stopPropagation()}></tfe-color-picker>
      </dialog>
    `;
  }

  private documentMouseDownAbortController!: AbortController;

  connectedCallback() {
    super.connectedCallback();
    this.documentMouseDownAbortController = new AbortController();
    document.addEventListener('mousedown', () => this.dialog.close(), {
      signal: this.documentMouseDownAbortController.signal,
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.documentMouseDownAbortController.abort();
  }

  @query('.tfe-color-map-editor-canvas')
  private canvas!: HTMLCanvasElement;

  updated(changed: PropertyValues<this>) {
    if (changed.has('width') || changed.has('height')) {
      // Set the canvas size to match its parent
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }

    if (
      changed.has('width') ||
      changed.has('height') ||
      changed.has('colorStopsNormalized') ||
      changed.has('interpolationMethod') ||
      changed.has('discrete') ||
      changed.has('bins') ||
      changed.has('showStopNumbers') ||
      changed.has('controlPointSize')
    ) {
      this.draw();
      this.dispatchEvent(
        new CustomEvent<ColorMapEditor>('change', {
          detail: this,
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /** Draws the gradient and the control points. */
  private draw() {
    const context = this.canvas.getContext('2d', {alpha: false});
    if (!context) return;

    // Draw either the gradient or discrete color bins depending on the settings
    if (this.discrete && this.bins && this.bins > 1 && this.discreteColorStopsNormalized) {
      // Draw discrete color bins
      const discreteColorStops = this.discreteColorStopsNormalized;
      for (const bin of discreteColorStops) {
        const startX = Math.floor(bin.lowerBound * this.canvas.width);
        const endX = Math.ceil(bin.upperBound * this.canvas.width);
        const width = Math.max(1, endX - startX);

        context.fillStyle = bin.color;
        context.fillRect(startX, 0, width, this.canvas.height);
      }
    } else {
      // Draw the smooth gradient
      for (let i = 0; i < this.canvas.width; ++i) {
        context.fillStyle = this.colorNormalized(i / this.canvas.width);
        context.fillRect(i, 0, 1, this.canvas.height);
      }
    }

    // Draw the control points. To ensure visibility everywhere, it is an alternating circle in white and black.
    for (let i = 0; i < this.colorStopsNormalized.length; i++) {
      const x = this.colorStopsNormalized[i].stop * this.canvas.width;
      const y = 0.5 * this.canvas.height;
      const color = this.colorStopsNormalized[i].color;

      context.fillStyle = color;
      context.beginPath();
      context.arc(x, y, this.controlPointSize, 0, 2 * Math.PI);
      context.fill();

      drawControlPoint(context, x, y, this.controlPointSize);

      // Below the control point we draw the number of the stop, if enabled.
      if (this.showStopNumbers) {
        if (i === 0) {
          context.textAlign = 'left';
        } else if (i === this.colorStopsNormalized.length - 1) {
          context.textAlign = 'right';
        } else {
          context.textAlign = 'center';
        }

        const brightness = d3Color.hsl(color).l;
        context.fillStyle = brightness < 0.5 ? 'white' : 'black';
        const value = this.colorStopsNormalized[i].stop * (this.range[1] - this.range[0]) + this.range[0];
        const text = value.toPrecision(3);
        context.fillText(text, x, this.canvas.height - 1);
      }
    }
  }

  /** This flag prevents click events to trigger when dragging control points small distances. */
  private draggedBefore: boolean = false;

  /** Tracks if the user is currently dragging a control point. */
  private isDragging: boolean = false;

  /** The index of the currently dragged control point. */
  private dragIndex: number = -1;

  private dragAbortController: AbortController | null = null;

  /** This listener is responsible for:
   *  - Starting dragging a control point if one was pressed on with the left mouse button.
   *  - Adding a control point if the left mouse button was pressed anywhere else (also starts dragging the newly
   *    created point).
   *  - Removing a control point on right-click.
   */
  private onMouseDown(ev: MouseEvent) {
    this.draggedBefore = false;

    if (ev.button === 0) {
      // Left Mouse Button
      // Check if a control point was selected with the left mouse button.
      this.checkDragStart(ev);

      if (!this.isDragging) {
        // If no control point was selected, a new one is being created and also immediately dragged.
        const x = Math.max(0, Math.min(1, ev.offsetX / this.canvas.width));
        const color = this.colorNormalized(x);
        const stop = {stop: x, color};
        this.colorStopsNormalized = [...this.colorStopsNormalized, stop].sort((a, b) => a.stop - b.stop);
        this.checkDragStart(ev);
      }
    } else if (ev.button === 2) {
      // Right Mouse Button
      ev.preventDefault();
      // If a control point was pressed on with the RMB it gets removed.
      for (let i = 1; i < this.colorStopsNormalized.length - 1; i++) {
        const stop = this.colorStopsNormalized[i];
        const dx = stop.stop * this.canvas.width - ev.offsetX;
        const dy = 0.5 * this.canvas.height - ev.offsetY;
        if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
          this.colorStopsNormalized = this.colorStopsNormalized.toSpliced(i, 1);
          return;
        }
      }
    }
  }

  /**
   * This function checks if a control point was selected, sets the dragIndex and isDragging fields and attaches a
   * mouse move listener to the document. This allows for more consistent control.
   */
  private checkDragStart(e: {offsetX: number; offsetY: number}) {
    // Figure out which control point was selected.
    this.dragIndex = -1;
    for (let i = 0; i < this.colorStopsNormalized.length; i++) {
      const stop = this.colorStopsNormalized[i];
      const dx = Math.abs(stop.stop * this.canvas.width - e.offsetX);
      if (dx < this.controlPointSize) {
        this.dragIndex = i;
        this.isDragging = true;
        break;
      }
    }

    if (this.isDragging) {
      // Attach a mouse move listener to the document.
      this.dragAbortController = new AbortController();
      document.addEventListener(
        'mousemove',
        (e) => {
          e.preventDefault();

          if (this.dragIndex > 0 && this.dragIndex < this.colorStopsNormalized.length - 1) {
            const offsetX = e.clientX - this.canvas.getBoundingClientRect().x;
            const leftBound = this.colorStopsNormalized[this.dragIndex - 1].stop + Number.EPSILON;
            const rightBound = this.colorStopsNormalized[this.dragIndex + 1].stop - Number.EPSILON;

            const newColorStops = [...this.colorStopsNormalized];
            newColorStops[this.dragIndex] = {
              ...this.colorStopsNormalized[this.dragIndex],
              stop: Math.max(leftBound, Math.min(rightBound, offsetX / this.canvas.width)),
            };
            this.colorStopsNormalized = newColorStops.sort((a, b) => a.stop - b.stop);
          }

          this.draggedBefore = true;
        },
        {signal: this.dragAbortController.signal}
      );

      // This listener is responsible to stop the dragging action, once the mouse is lifted.
      document.addEventListener(
        'mouseup',
        () => {
          if (this.dragAbortController) {
            this.dragAbortController.abort();
            this.dragAbortController = null;
            this.isDragging = false;
            this.dragIndex = -1;
          }
        },
        {signal: this.dragAbortController.signal}
      );
    }
  }

  private colorPickerChangeAbortController: AbortController | null = null;

  /** When clicking a control point the color picker is shown. */
  private onClick(ev: MouseEvent) {
    if (this.draggedBefore) {
      return;
    }

    ev.stopPropagation();
    let index: number | null = null;
    for (let i = 0; i < this.colorStopsNormalized.length; i++) {
      index = i;
      const dx = Math.abs(this.colorStopsNormalized[i].stop * this.canvas.width - ev.offsetX);
      if (dx < this.controlPointSize) {
        break;
      }
    }

    if (index !== null) {
      this.colorPickerChangeAbortController?.abort();
      this.colorPickerChangeAbortController = new AbortController();
      this.colorPicker.addEventListener(
        'change',
        (ev: Event) => {
          const newStops = [...this.colorStopsNormalized];
          newStops[index!].color = (ev as CustomEvent<ColorPicker>).detail.hex;
          this.colorStopsNormalized = newStops;
        },
        {signal: this.colorPickerChangeAbortController.signal}
      );
      this.colorPicker.hex = this.colorStopsNormalized[index].color;
      this.showDialog(ev);
    }
  }

  @query('.tfe-color-map-editor-picker-container')
  private dialog!: HTMLDialogElement;

  @query('tfe-color-picker')
  private colorPicker!: ColorPicker;

  private showDialog(ev: MouseEvent) {
    ev.stopPropagation();
    // Store mouse position
    const mouseX = ev.clientX;
    const mouseY = ev.clientY;

    // Show the dialog
    this.dialog.show();

    // Position the dialog after it's visible
    requestAnimationFrame(() => {
      const rect = this.dialog.getBoundingClientRect();

      // Ensure dialog stays within viewport
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      const left = Math.min(Math.max(0, mouseX), maxX);
      const top = Math.min(Math.max(0, mouseY), maxY);

      this.dialog.style.left = `${left}px`;
      this.dialog.style.top = `${top}px`;
    });
  }
}
