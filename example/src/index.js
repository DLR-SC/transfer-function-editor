import {
    TransferFunctionEditor,
    TransparencyEditor,
    ColorMapEditor,
    ColorPicker
} from '../../dist/transfer-function-editor.modern'

const tf = new TransferFunctionEditor('#tf-editor');
tf.onChange((tf) => {
    document.querySelector('#tf-output').innerText = JSON.stringify(tf, null, 2);
})

const tp = new TransparencyEditor('#tp');
tp.onChange((tf) => {
    document.querySelector('#tp-output').innerText = JSON.stringify(tf, null, 2);
});

const cm = new ColorMapEditor('#cm', [
    {stop: 0, rgb: '#0f0'},
    {stop: 0.5, rgb: '#f00'},
    {stop: 1, rgb: '#000'}
]);

cm.onChange((cm) => {
    document.querySelector('#cm-output').innerText = JSON.stringify(cm, null, 2);
});

const cp = new ColorPicker('#cp', {initialColor: 'cyan'});

cp.onChange((c) => {
    document.querySelector('#cp-output').innerText = JSON.stringify(c, null, 2);
});