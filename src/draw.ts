export function drawControlPoint(context: CanvasRenderingContext2D, x: number, y: number, pointSize: number) {
  const strokes = 10;
  for (let i = 0; i < strokes; i++) {
    context.beginPath();
    context.strokeStyle = i % 2 === 0 ? 'white' : 'black';
    context.arc(x, y, pointSize, (i / strokes) * (2 * Math.PI), ((i + 1) / strokes) * (2 * Math.PI));
    context.stroke();
  }
}
