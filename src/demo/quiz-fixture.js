// Synthetic practice only. These URLs are validation inputs, never real course material.
// Production eliminates the DEV import; tests intercept every external navigation.
export function createDemoQuizReader({ questionCount = null } = {}) {
  return async function readDemoQuiz(unitId) {
    const index = Number(unitId.slice(1));
    const schemaVersion = [2, 3].includes(((index - 1) % 4) + 1) ? 2 : 1;
    const count = questionCount ?? (index % 2 === 0 ? 5 : 4);
    return {
      schemaVersion,
      unitId,
      title: `${unitId} · 視覺 Demo`,
      googleFormUrl: `https://forms.gle/IslandLabDemo${unitId}`,
      questions: Array.from({ length: count }, (_, i) => {
        const id = `Q${String(i + 1).padStart(2, '0')}`;
        const labels = schemaVersion === 2 && i % 2 === 0 ? 'ABC' : 'ABCD';
        return {
          id,
          title: `合成練習 ${i + 1}（非正式教材）`,
          prompt:
            schemaVersion === 2
              ? '這是單選介面測試。A 或 C 都是可接受答案，選其中一個即可。'
              : `這是介面測試，請單選 ${'ABCD'[i % 4]}。所有影片及表單連結均為測試字串，不是教材。`,
          questionVideoUrl: `https://youtu.be/DEMO${String(index * 20 + i).padStart(7, '0')}`,
          explanationVideoUrl: `https://www.youtube.com/watch?v=DEMO${String(index * 20 + i + 5).padStart(7, '0')}`,
          options: [...labels].map((label) => `合成選項 ${label} · ${id}`),
          ...(schemaVersion === 2
            ? { correctOptions: ['A', 'C'] }
            : { correctOption: 'ABCD'[i % 4] }),
          explanationText:
            '合成解說：這裡只驗證答對後顯示、文字換行及單選判答。\n不包含任何真實課程答案。',
        };
      }),
    };
  };
}
