/** Whether two [start, end] ranges overlap. Null end means unbounded (open contract). */
export function assignmentRangesOverlap(start1, end1, start2, end2) {
  const t1 = new Date(start1).getTime();
  const t2 = new Date(start2).getTime();
  const e1 =
    end1 == null ? Number.MAX_SAFE_INTEGER : new Date(end1).getTime();
  const e2 =
    end2 == null ? Number.MAX_SAFE_INTEGER : new Date(end2).getTime();
  return t1 <= e2 && t2 <= e1;
}
