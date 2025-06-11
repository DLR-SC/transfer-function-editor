import {html, LitElement, PropertyValues} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import {TransferFunctionMixin} from './internal/mixins/TransferFunctionMixin';

@customElement('tfe-transparency-editor')
export class TransparencyEditor extends TransferFunctionMixin(LitElement) {
  @property({type: Number, attribute: 'control-point-size'})
  controlPointSize: number = 7;

  @property({type: String})
  width: string = '100%';

  @property({type: String})
  height: string = '100%';

  protected render() {
    return html`
      <canvas
        class="tfe-transparency-editor-canvas"
        style="width: ${this.width}; height: ${this.height}; border: 1px solid black; image-rendering: pixelated;"
        @mousedown=${this.onMouseDown}
        @contextmenu=${(ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
          return false;
        }}
      ></canvas>
    `;
  }

  @query('.tfe-transparency-editor-canvas')
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
      changed.has('alphaStopsNormalized') ||
      changed.has('colorMapNormalized') ||
      changed.has('controlPointSize') ||
      changed.has('disableAlphaGrid') ||
      changed.has('alphaGridSize')
    ) {
      this.draw();
    }

    if (changed.has('alphaStopsNormalized') || changed.has('colorMapNormalized') || changed.has('range')) {
      this.dispatchEvent(
        new CustomEvent<TransparencyEditor>('change', {
          detail: this,
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /** Draws the gradient and the control points. */
  private draw() {
    const context = this.canvas.getContext('2d', {alpha: true});
    if (!context) return;

    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // If the alpha grid is enabled, we draw it.
    if (!this.disableAlphaGrid) {
      context.fillStyle = '#CACACA';
      for (let y = 0; y < this.canvas.height / this.alphaGridSize; y++) {
        for (let x = 0; x < this.canvas.width / this.alphaGridSize; x++) {
          if ((x % 2 == 0 && y % 2 == 0) || (x % 2 == 1 && y % 2 == 1)) {
            context.fillRect(x * this.alphaGridSize, y * this.alphaGridSize, this.alphaGridSize, this.alphaGridSize);
          }
        }
      }
    }

    // Draw either the gradient or discrete color bins depending on the settings
    if (this.discrete && this.bins && this.bins > 1 && this.discreteColorStopsNormalized) {
      // Draw discrete color bins
      const binWidth = this.canvas.width / this.bins;

      for (let i = 0; i < this.bins; i++) {
        const normalizedPosition = (i + 0.5) / this.bins; // Center position of bin
        const alpha = this.alphaNormalized(normalizedPosition);

        // Draw the bin with uniform color
        context.fillStyle = this.alphaColorNormalized(normalizedPosition);
        context.fillRect(i * binWidth, (1 - alpha) * this.canvas.height, binWidth, alpha * this.canvas.height);

        // Clear the area above the bin if alpha grid is enabled
        if (!this.disableAlphaGrid) {
          context.clearRect(i * binWidth, 0, binWidth, (1 - alpha) * this.canvas.height);
        }
      }

    } else {
      // Draw the color gradient.
      for (let i = 0; i < this.canvas.width; ++i) {
        const alpha = this.alphaNormalized(i / (this.canvas.width - 1));
        context.fillStyle = this.alphaColorNormalized(i / (this.canvas.width - 1));
        context.fillRect(i, (1 - alpha) * this.canvas.height, 1, alpha * this.canvas.height);

        if (!this.disableAlphaGrid) {
          context.clearRect(i, 0, 1, (1 - alpha) * this.canvas.height);
        }
      }
    }


    // Draw the lines between points.
    context.strokeStyle = 'black';
    context.beginPath();
    for (let i = 0; i < this.alphaStopsNormalized.length; i++) {
      const x = this.alphaStopsNormalized[i].stop * this.canvas.width;
      const y = (1 - this.alphaStopsNormalized[i].alpha) * this.canvas.height;
      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();

    // Draw the control points.
    context.fillStyle = 'white';
    for (let i = 0; i < this.alphaStopsNormalized.length; i++) {
      const x = this.alphaStopsNormalized[i].stop * this.canvas.width;
      const y = (1 - this.alphaStopsNormalized[i].alpha) * this.canvas.height;
      context.strokeStyle = 'black';
      context.beginPath();
      context.arc(x, y, this.controlPointSize, 0, 2 * Math.PI);
      context.fill();
      context.stroke();
    }
  }

  /** Adds a control point at the given stop with the given alpha value. */
  private addControlPoint(stop: number, alpha: number): void {
    this.alphaStopsNormalized = [...this.alphaStopsNormalized, {stop, alpha}].sort((a, b) => a.stop - b.stop);
  }

  /** Remove a control point at the given pixel coordinates. */
  private removeControlPointAt(x: number, y: number): void {
    let indexToDelete = -1;
    for (let i = 1; i < this.alphaStopsNormalized.length - 1; i++) {
      const controlPoint = this.alphaStopsNormalized[i];
      const dx = controlPoint.stop * this.canvas.width - x;
      const dy = (1 - controlPoint.alpha) * this.canvas.height - y;
      if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
        indexToDelete = i;
        break;
      }
    }
    if (indexToDelete !== -1) {
      this.alphaStopsNormalized = this.alphaStopsNormalized.toSpliced(indexToDelete, 1);
    }
  }

  /** Tracks if the user is currently dragging a control point. */
  private isDragging: boolean = false;

  /** The index of the currently dragged control point. */
  private dragIndex: number = -1;

  private abortController: AbortController | null = null;

  private onMouseDown(ev: MouseEvent) {
    if (ev.button === 0) {
      // Left click
      this.checkDragStart(ev);
    }

    if (this.isDragging) {
      return;
    }

    if (ev.button === 0) {
      // Left click
      const {stop, alpha} = this.pixelToNormalized(ev.offsetX, ev.offsetY);
      this.addControlPoint(stop, alpha);
      this.checkDragStart(ev);
    } else if (ev.button === 2) {
      // Right click
      ev.preventDefault();
      this.removeControlPointAt(ev.offsetX, ev.offsetY);
    }
  }

  private checkDragStart(e: {offsetX: number; offsetY: number}) {
    // Figure out which control point was selected.
    this.dragIndex = -1;
    for (let i = 0; i < this.alphaStopsNormalized.length; i++) {
      const controlPoint = this.alphaStopsNormalized[i];
      const dx = controlPoint.stop * this.canvas.width - e.offsetX;
      const dy = (1 - controlPoint.alpha) * this.canvas.height - e.offsetY;
      if (Math.sqrt(dx * dx + dy * dy) < this.controlPointSize) {
        this.dragIndex = i;
        this.isDragging = true;
        break;
      }
    }

    if (this.isDragging) {
      // Attach a mouse move listener to the document.
      this.abortController = new AbortController();

      document.addEventListener(
        'mousemove',
        (e) => {
          e.preventDefault();
          const offsetX = e.clientX - this.canvas.getBoundingClientRect().x;
          const offsetY = e.clientY - this.canvas.getBoundingClientRect().y;

          const {stop, alpha} = this.pixelToNormalized(offsetX, offsetY);

          const newAlphaStops = [...this.alphaStopsNormalized];

          if (this.dragIndex === 0) {
            newAlphaStops[this.dragIndex].alpha = alpha;
          } else if (this.dragIndex === this.alphaStopsNormalized.length - 1) {
            newAlphaStops[this.dragIndex].alpha = alpha;
          } else {
            const leftBound = this.alphaStopsNormalized[this.dragIndex - 1].stop + Number.EPSILON;
            const rightBound = this.alphaStopsNormalized[this.dragIndex + 1].stop - Number.EPSILON;
            newAlphaStops[this.dragIndex].stop = Math.max(leftBound, Math.min(rightBound, stop));
            newAlphaStops[this.dragIndex].alpha = alpha;
          }

          this.alphaStopsNormalized = newAlphaStops;
        },
        {signal: this.abortController.signal}
      );

      document.addEventListener(
        'mouseup',
        () => {
          if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            this.isDragging = false;
            this.dragIndex = -1;
          }
        },
        {signal: this.abortController.signal}
      );
    }
  }

  /** This helper function calculates which pixels correspond to which stop and alpha value. */
  private pixelToNormalized(x: number, y: number): {stop: number; alpha: number} {
    const stop = Math.max(0, Math.min(1, x / this.canvas.width));
    const alpha = Math.max(0, Math.min(1, 1 - y / this.canvas.height));
    return {stop, alpha};
  }
}
