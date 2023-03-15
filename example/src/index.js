import {
    TransferFunctionEditor,
    TransparencyEditor,
    ColorMapEditor,
    ColorPicker
} from '../../dist/transfer-function-editor.module'

const tf = new TransferFunctionEditor('#tf');

const tp = new TransparencyEditor('#tp');

const cm = new ColorMapEditor('#cm', [
    {stop: 0, rgb: '#0f0'},
    {stop: 0.5, rgb: '#f00'},
    {stop: 1, rgb: '#000'}
]);

const cp = new ColorPicker('#cp', {initialColor: 'cyan'});
