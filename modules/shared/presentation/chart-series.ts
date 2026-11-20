const skuLineColors: Record<string, string> = {
  BL: "#2563eb",
  GY: "#171717",
  PK: "#ec4899",
  RE: "#dc2626",
};

export function skuLineColor(label: string) {
  const code = label.trim().toUpperCase().match(/(?:^|[^A-Z])(BL|GY|PK|RE)$/)?.[1];
  return code ? skuLineColors[code] : undefined;
}

export function tooltipOrder<T extends { value: number | null }>(rows: T[]) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      if (left.row.value === null || right.row.value === null) return Number(left.row.value === null) - Number(right.row.value === null);
      return right.row.value - left.row.value || left.index - right.index;
    })
    .map(item => item.row);
}

export function smoothLine(points: { x: number; y: number | null }[]) {
  const runs: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  for (const point of points) {
    if (point.y === null) {
      if (current.length) runs.push(current);
      current = [];
      continue;
    }
    current.push({ x: point.x, y: point.y });
  }
  if (current.length) runs.push(current);
  return runs.flatMap(monotoneLine).join(" ");
}

function monotoneLine(points: { x: number; y: number }[]) {
  if (points.length < 2) return [];
  const slopes = points.slice(1).map((point, index) => {
    const dx = point.x - points[index].x;
    return { dx, slope: dx === 0 ? 0 : (point.y - points[index].y) / dx };
  });
  const tangent = slopes.map((item, index) => {
    if (index === 0) return item.slope;
    const previous = slopes[index - 1].slope;
    if (previous === 0 || item.slope === 0 || previous > 0 !== item.slope > 0) return 0;
    return (previous + item.slope) / 2;
  });
  tangent.push(slopes[slopes.length - 1].slope);
  for (let index = 0; index < slopes.length; index += 1) {
    const slope = slopes[index].slope;
    if (slope === 0) {
      tangent[index] = 0;
      tangent[index + 1] = 0;
      continue;
    }
    const a = tangent[index] / slope;
    const b = tangent[index + 1] / slope;
    const size = Math.hypot(a, b);
    if (size > 3) {
      tangent[index] = 3 / size * a * slope;
      tangent[index + 1] = 3 / size * b * slope;
    }
  }
  let path = `M${points[0].x} ${points[0].y}`;
  slopes.forEach((item, index) => {
    const dx = item.dx / 3;
    path += `C${points[index].x + dx} ${points[index].y + tangent[index] * dx} ${points[index + 1].x - dx} ${points[index + 1].y - tangent[index + 1] * dx} ${points[index + 1].x} ${points[index + 1].y}`;
  });
  return [path];
}
