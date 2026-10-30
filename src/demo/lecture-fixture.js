// Format-only fixtures. These deliberately invented IDs are NOT course material.
import { LectureDataError } from '../lecture-data.js';
const item = (number, title = `示範影片 ${number}（測試連結，非教材）`) => ({
  title,
  url: `https://www.youtube.com/watch?v=DEMO${String(number).padStart(7, '0')}`,
});
export async function readDemoLecture(unitId) {
  if (unitId === 'S05') throw new LectureDataError('HTTP', 'S05 示範影片資料載入失敗（HTTP 404）');
  const videos =
    unitId === 'S01'
      ? [item(1)]
      : unitId === 'S02'
        ? [item(4), item(2), item(8), item(1)]
        : unitId === 'S03'
          ? Array.from({ length: 10 }, (_, i) =>
              item(
                i + 1,
                `第 ${i + 1} 部 · ${i === 5 ? 'Mixed title 混合標題' : 'Lecture 示範教學'}（測試連結，非教材）`,
              ),
            )
          : unitId === 'S04'
            ? [item(9, '第三章'), item(2, '第一章'), item(7, '第二章')]
            : [item(Number(unitId.slice(1)))];
  return { unitId, title: `${unitId} 本機 Lecture 示範清單`, videos };
}
