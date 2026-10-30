import './quiz.css';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function externalLink(className, text, url) {
  const link = element('a', className, text);
  // Only validated, normalized session data reaches this view. Keep native
  // navigation: rendering, answering and closing never open an external tab.
  link.setAttribute('href', url);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  link.setAttribute('aria-label', `${text}（另開新分頁）`);
  return link;
}

/** Project a validated per-unit session into the existing shared native dialog. */
export function createQuizController({ dialog, sessions, onProgress = () => {}, demo = false }) {
  let active = null;
  const isCurrent = (entry) =>
    active === entry && dialog.open && dialog.revision === entry.revision;

  function open(unitId, questionId, source) {
    const session = sessions.get(unitId);
    const question = session?.question(questionId);
    // Failed/locked assignments and nonexistent Q05 never acquire a fake view.
    if (!session || !question) return false;

    const entry = {
      unitId,
      questionId,
      session,
      revision: null,
      result: session.hasPassed(questionId) ? 'review' : 'unanswered',
    };
    const root = element('div', 'quiz-content');
    root.dataset.unit = unitId;
    root.dataset.question = questionId;
    root.append(element('p', 'quiz-unit-title', session.unit.title));
    if (demo)
      root.append(
        element('p', 'quiz-demo-note', '本機示範資料：以下為測試題目與連結，並非正式課程教材。'),
      );
    if (question.prompt?.trim()) root.append(element('p', 'quiz-prompt', question.prompt));
    root.append(
      externalLink(
        'quiz-question-video quiz-resource-link',
        'Watch Question Video',
        question.questionVideoUrl,
      ),
    );

    const form = element('form', 'quiz-answer');
    const options = element('fieldset', 'quiz-options');
    options.append(element('legend', '', '選擇一個答案'));
    const radios = [];
    question.options.forEach((text, index) => {
      const label = element('label', 'quiz-option');
      const radio = element('input', 'quiz-radio');
      radio.type = 'radio';
      radio.name = 'quiz-answer';
      radio.value = 'ABCD'[index];
      radio.required = true;
      radios.push(radio);
      const copy = element('span', 'quiz-option-copy', `${radio.value}. ${text}`);
      label.append(radio, copy);
      options.append(label);
    });
    const submit = element('button', 'quiz-submit', 'Submit Answer');
    submit.type = 'submit';
    const feedback = element('p', 'quiz-feedback');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    feedback.setAttribute('aria-atomic', 'true');
    const progress = element('p', 'quiz-progress');
    const explanation = element('section', 'quiz-explanation');
    const completion = element('section', 'quiz-completion');
    explanation.hidden = true;
    completion.hidden = true;
    form.append(options, submit, feedback);
    root.append(form, progress, explanation, completion);

    const renderResources = () => {
      const passed = session.hasPassed(questionId);
      root.dataset.passed = String(passed);
      progress.textContent = `${unitId} · ${session.count} / ${session.total} 題完成`;
      // Append once, retaining radio focus, existing links and dialog scroll.
      if (passed && explanation.hidden) {
        explanation.hidden = false;
        explanation.append(
          element('h3', 'quiz-section-title', '解說與回顧'),
          externalLink(
            'quiz-explanation-video quiz-resource-link',
            'Watch Explanation Video',
            question.explanationVideoUrl,
          ),
        );
        if (question.explanationText?.trim())
          explanation.append(element('p', 'quiz-explanation-text', question.explanationText));
      }
      if (session.complete && completion.hidden) {
        completion.hidden = false;
        completion.append(
          element('h3', 'quiz-section-title', `${unitId} 已完成！`),
          element('p', '', `全部 ${session.total} 題已答對，可前往 Google Form。`),
          externalLink(
            'quiz-form-link quiz-resource-link',
            'Open Google Form',
            session.unit.googleFormUrl,
          ),
        );
      }
    };
    if (session.hasPassed(questionId)) {
      feedback.dataset.result = 'correct';
      feedback.textContent = '這題已完成，可以再次查看題目與解說；重試不會撤銷完成狀態。';
    }
    renderResources();
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      // Detached forms and queued events from an older modal cannot submit.
      if (!isCurrent(entry)) return;
      const checked = radios.filter((radio) => radio.checked);
      if (checked.length !== 1) {
        feedback.dataset.result = 'missing';
        feedback.textContent = '請先選擇一個答案。';
        return;
      }
      const correct = session.answer(questionId, checked[0].value);
      entry.result = correct ? 'correct' : 'incorrect';
      feedback.dataset.result = entry.result;
      feedback.textContent = correct
        ? '答對了！這題已完成，可自由觀看解說影片。'
        : session.hasPassed(questionId)
          ? '這次答案不正確，可以再試一次；這題原有的完成狀態與解說仍保留。'
          : '答案不正確，可以再試一次；其他已完成的題目會保留。';
      renderResources();
      if (correct) onProgress(unitId, questionId);
    });

    active = entry;
    entry.revision = dialog.showContent(
      `${unitId} · ${questionId}${question.title?.trim() ? ` · ${question.title}` : ''}`,
      root,
      source,
      `${unitId} · ${questionId} · Quiz`,
      { kind: 'quiz' },
    );
    return true;
  }

  function snapshot() {
    if (!active)
      return {
        status: 'idle',
        unitId: null,
        questionId: null,
        result: null,
        passed: false,
        count: 0,
        total: 0,
        complete: false,
      };
    const { session, questionId } = active;
    return {
      status: isCurrent(active) ? 'ready' : 'closed',
      unitId: active.unitId,
      questionId,
      result: active.result,
      passed: session.hasPassed(questionId),
      count: session.count,
      total: session.total,
      complete: session.complete,
    };
  }
  return { open, snapshot };
}
