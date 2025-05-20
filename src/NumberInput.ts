import {html, LitElement} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';

/**
 * This Element is a wrapper around an HTMLInputElement of type number. It adds the ability to change the number with
 * the scroll wheel and adds robust validation, so that the field always contains a number.
 */
@customElement('tfe-number-input')
export class NumberInput extends LitElement {
  /** An optional label, that wraps the input element. */
  @property({type: String})
  label?: string;

  /** An optional lower bound for accepted values. */
  @property({type: Number})
  min?: number;

  /** An optional upper bound for accepted values. */
  @property({type: Number})
  max?: number;

  /** Controls how much the value increases/decreases on button and scroll wheel input. */
  @property({type: Number})
  step: number = 1;

  /** If the value shall be treated as an integer. If true, it always gets rounded. */
  @property({type: Boolean, attribute: 'integer-only'})
  integerOnly: boolean = false;

  /** Set the input as disabled. */
  @property({type: Boolean})
  disabled: boolean = false;

  private _value: number = 0;

  /** The actual number. This always contains a value. */
  @property({type: Number})
  set value(value: number) {
    value = this.integerOnly ? Math.round(value) : value
    if (value === this._value) {
      return;
    }

    let tmp = value;
    if (this.min !== undefined && value < this.min) {
      tmp = this.min;
    } else if (this.max !== undefined && value > this.max) {
      tmp = this.max;
    }

    this._value = tmp;

    // Update the input field value to match the clamped value
    // This is necessary to make sure the UI stays in sync
    if (this.input && !isNaN(this._value)) {
      this.input.valueAsNumber = this._value;

      this.dispatchEvent(
        new CustomEvent<number>('change', {
          detail: this._value,
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  get value(): number {
    return this._value;
  }

  @query('.tfe-number-input-field-input')
  private input!: HTMLInputElement;

  protected render() {
    const inputField = html`
      <input
        class="tfe-number-input-field-input"
        part="input-field"
        type="number"
        ?disabled=${this.disabled}
        min=${this.min}
        max=${this.max}
        step=${this.step}
        .value=${this.value}
        @wheel=${this.onWheel}
        @input=${this.onInput}
        @blur=${this.onFocusOut}
        @keypress=${this.onKeyPress}
        @mousedown=${this.onMouseDown}
        style="cursor: ${this.isDragging ? 'ew-resize' : 'text'}"

      />
    `;

    if (this.label) {
      return html`
        <label class="tfe-number-input-field-label" part="input-label"> ${this.label} ${inputField} </label>
      `;
    }

    return inputField;
  }

  @state()
  private isDragging = false;
  private lastX = 0;
  private abortController: AbortController | null = null;
  private dragStartTime = 0;
  private dragStartX = 0;

  private onMouseDown(ev: MouseEvent) {
    if (ev.button !== 0) return;

    this.dragStartTime = Date.now();
    this.dragStartX = ev.clientX;

    this.abortController = new AbortController();

    document.addEventListener('mousemove', this.onMouseMove.bind(this), {
      signal: this.abortController.signal
    });

    document.addEventListener('mouseup', this.onMouseUp.bind(this), {
      once: true,
      signal: this.abortController.signal
    });

    this.lastX = ev.clientX;
  }

  private onMouseMove(ev: MouseEvent) {
    // Start dragging only if mouse has moved more than 5 pixels or after holding for 200 ms
    if (!this.isDragging) {
      const timeDiff = Date.now() - this.dragStartTime;
      const distanceMoved = Math.abs(ev.clientX - this.dragStartX);

      if (distanceMoved > 5 || timeDiff > 200) {
        this.isDragging = true;
        ev.preventDefault();
        this.input.blur(); // Remove focus to hide the cursor
      }
      return;
    }

    const delta = ev.clientX - this.lastX;
    this.lastX = ev.clientX;

    // Adjust sensitivity - you can modify this multiplier to make it more/less sensitive
    const change = delta * this.step;

    this.value = this.value + change;
  }

  private onMouseUp(ev: MouseEvent) {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // If we weren't dragging and the mouse hasn't moved much, treat it as a click
    if (!this.isDragging && Math.abs(ev.clientX - this.dragStartX) < 5) {
      this.input.focus();
      // If text was selected, keep it selected
      if (this.input.selectionStart !== null) {
        this.input.setSelectionRange(0, this.input.value.length);
      }
    }

    this.isDragging = false;
  }


  private onWheel(ev: WheelEvent) {
    if (this.disabled) return;

    ev.preventDefault();

    if (ev.deltaY > 0) {
      // Decrement
      this.value = this.value - this.step;
    } else if (ev.deltaY < 0) {
      // Increment
      this.value = this.value + this.step;
    }
  }

  private onInput() {
    if (isFinite(this.input.valueAsNumber)) {
      this.value = this.input.valueAsNumber;
    }
  }

  private onFocusOut() {
    if (!isFinite(this.input.valueAsNumber)) {
      this.input.valueAsNumber = this.value;
    }
  }

  private onKeyPress(ev: KeyboardEvent) {
    if (ev.key === 'Enter') {
      if (!isFinite(this.input.valueAsNumber)) {
        this.input.valueAsNumber = this.value;
      }
    }
  }
}
