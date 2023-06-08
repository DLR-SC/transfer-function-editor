import {
  TransferFunctionEditor,
  TransparencyEditor,
  ColorMapEditor,
  ColorPicker
} from "../../dist/transfer-function-editor.modern";

const tf = new TransferFunctionEditor("#tf-editor", {
  initialColorMap: {
    colorStops: [
      {stop: 0, color: "blue"},
      {stop: 0.5, color: "white"},
      {stop: 1, color: "red"}
    ],
    interpolationMethod: "HSL"
  }
});
tf.addListener((tf) => {
  document.querySelector("#tf-output").innerText = JSON.stringify(tf.getTransferFunction(), null, 2);
});

const tp = new TransparencyEditor("#tp");
tp.addListener((te) => {
  document.querySelector("#tp-output").innerText = JSON.stringify(te.getAlphaStops(), null, 2);
});

const cm = new ColorMapEditor("#cm", {
  initialColorMap: {
    colorStops: [
      { stop: 0, color: "#0f0" },
      { stop: 0.5, color: "#f00" },
      { stop: 0.75, color: "#bb00bb" },
      { stop: 1, color: "#000" }
    ],
    interpolationMethod: "HSL",
    discrete: false,
    bins: 9
  },
  showStopNumbers: true,
  binSelectorEditable: true,
  interpolationMethodsEditable: true
});

cm.addListener((cm) => {
  const result = cm.discrete ? cm.getDiscreteColorMap() : cm.getColorMap();
  document.querySelector("#cm-output").innerText = JSON.stringify(result, null, 2);
});

const cp = new ColorPicker("#cp", { initialColor: "cyan" });

cp.addListener((c) => {
  document.querySelector("#cp-output").innerText = JSON.stringify(c.getColor(), null, 2);
});