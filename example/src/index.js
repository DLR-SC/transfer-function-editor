
import {TransferFunctionEditor, ColorMap} from '../../dist/transfer-function-editor'

const initialTransferFunction = [0, 0.5, 1];
const tf = new TransferFunctionEditor('#tf', initialTransferFunction);

const cm = new ColorMap('#cm');