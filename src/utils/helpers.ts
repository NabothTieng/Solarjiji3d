


export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}


export function getRandomColor(): string {
  const colors = [
    '#4287f5',
    '#42f554',
    '#f54242',
    '#f5a442',
    '#9b42f5',
    '#42f5f5',
    '#f542d4',
    '#f5f542',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}


export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}


export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}


export function canMergeLines(
  line1Start: { x: number; y: number },
  line1End: { x: number; y: number },
  line2Start: { x: number; y: number },
  line2End: { x: number; y: number },
  threshold: number = 20
): boolean {

  const d1 = distance(line1Start.x, line1Start.y, line2Start.x, line2Start.y);
  const d2 = distance(line1Start.x, line1Start.y, line2End.x, line2End.y);
  const d3 = distance(line1End.x, line1End.y, line2Start.x, line2Start.y);
  const d4 = distance(line1End.x, line1End.y, line2End.x, line2End.y);

  return Math.min(d1, d2, d3, d4) < threshold;
}


export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}


export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}


export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
