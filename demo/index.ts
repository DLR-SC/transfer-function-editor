import '../src/index'
import {ColorMapEditor, ColorPicker, TransferFunctionEditor, TransparencyEditor} from '../src';

const cp: ColorPicker = document.querySelector('tfe-color-picker')!;
const cpo: HTMLPreElement = document.querySelector('#cp-output')!;

cpo.innerText = JSON.stringify(cp.color, null, 2);
cp.addEventListener('change', (e: Event) => {
  cpo.innerText = JSON.stringify((e as CustomEvent<ColorPicker>).detail.color, null, 2)
});


const cm: ColorMapEditor = document.querySelector('tfe-color-map-editor')!;
const cmo: HTMLPreElement = document.querySelector('#cm-output')!;

cmo.innerText = JSON.stringify(cm.colorMap, null, 2);
cm.addEventListener('change', (e: Event) => {
  cmo.innerText = JSON.stringify((e as CustomEvent<ColorMapEditor>).detail.colorMap, null, 2);
});


const te: TransparencyEditor = document.querySelector('tfe-transparency-editor')!;
const teo: HTMLPreElement = document.querySelector('#te-output')!;

teo.innerText = JSON.stringify(te.alphaStops, null, 2);
te.addEventListener('change', (e: Event) => {
  teo.innerText = JSON.stringify((e as CustomEvent<TransparencyEditor>).detail.alphaStops, null, 2);
});


const tfe: TransferFunctionEditor = document.querySelector('tfe-transfer-function-editor')!;
const tfeo: HTMLPreElement = document.querySelector('#tfe-output')!;

tfeo.innerText = JSON.stringify(tfe.transferFunction, null, 2);
tfe.addEventListener('change', (e: Event) => {
  tfeo.innerText = JSON.stringify((e as CustomEvent<TransferFunctionEditor>).detail.transferFunction, null, 2);
});
