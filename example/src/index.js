
import {TransferFunctionEditor, ColorPicker} from '../../dist/transfer-function-editor'

const tf = new TransferFunctionEditor('#tf');
const cp = new ColorPicker('#cp', false, '#778812');
cp.onChange((color) => console.log(color));